package com.localmighty.network

import android.os.Build
import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject

sealed class ConnectionState {
    object Disconnected : ConnectionState()
    object Connecting : ConnectionState()
    object Connected : ConnectionState()
    data class Reconnecting(val attempt: Int) : ConnectionState()
    data class Error(val message: String) : ConnectionState()
}

object SocketManager {
    private const val TAG = "SocketManager"

    private var socket: Socket? = null

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState

    private var onSendSmsRequest: ((String, String) -> Unit)? = null
    private var onDismissNotificationRequest: ((String) -> Unit)? = null

    fun connect(serverUrl: String, token: String?) {
        try {
            disconnect()

            val options = IO.Options().apply {
                if (token != null) {
                    auth = mapOf("token" to token)
                }
                transports = arrayOf("websocket")
                reconnection = true
                reconnectionAttempts = Int.MAX_VALUE
                reconnectionDelay = 1000
                reconnectionDelayMax = 5000
            }

            socket = IO.socket(serverUrl, options).apply {
                on(Socket.EVENT_CONNECT) {
                    Log.d(TAG, "Connected to server")
                    _connectionState.value = ConnectionState.Connected

                    // Notify server that phone is connected
                    emit(SocketEvents.PHONE_CONNECTED, JSONObject().apply {
                        put("deviceName", Build.MODEL)
                        put("model", Build.MODEL)
                        put("androidVersion", Build.VERSION.RELEASE)
                    })
                }

                on(Socket.EVENT_DISCONNECT) {
                    Log.d(TAG, "Disconnected from server")
                    _connectionState.value = ConnectionState.Disconnected
                }

                on(Socket.EVENT_CONNECT_ERROR) { args ->
                    val error = args.firstOrNull()?.toString() ?: "Unknown error"
                    Log.e(TAG, "Connection error: $error")
                    // Don't show error if we're reconnecting
                    if (_connectionState.value !is ConnectionState.Reconnecting) {
                        _connectionState.value = ConnectionState.Error(error)
                    }
                }

                on("reconnect_attempt") { args ->
                    val attempt = (args.firstOrNull() as? Number)?.toInt() ?: 1
                    Log.d(TAG, "Reconnection attempt: $attempt")
                    _connectionState.value = ConnectionState.Reconnecting(attempt)
                }

                on("reconnect_failed") {
                    Log.e(TAG, "Reconnection failed after all attempts")
                    _connectionState.value = ConnectionState.Error("Reconnexion echouee")
                }

                on("reconnect") {
                    Log.d(TAG, "Reconnected successfully")
                    // Connected state will be set by EVENT_CONNECT
                }

                on(SocketEvents.SEND_SMS) { args ->
                    val data = args.firstOrNull() as? JSONObject
                    data?.let {
                        val address = it.optString("address")
                        val body = it.optString("body")
                        Log.d(TAG, "Received send SMS request: $address")
                        onSendSmsRequest?.invoke(address, body)
                    }
                }

                on(SocketEvents.DISMISS_NOTIFICATION) { args ->
                    val data = args.firstOrNull() as? JSONObject
                    data?.let {
                        val id = it.optString("id")
                        Log.d(TAG, "Received dismiss notification request: $id")
                        onDismissNotificationRequest?.invoke(id)
                    }
                }

                on(SocketEvents.REQUEST_SYNC) {
                    Log.d(TAG, "Received sync request")
                    // Trigger sync (will be handled by the service)
                }

                connect()
            }

            _connectionState.value = ConnectionState.Connecting
            Log.d(TAG, "Connecting to $serverUrl")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect", e)
            _connectionState.value = ConnectionState.Error(e.message ?: "Connection failed")
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        _connectionState.value = ConnectionState.Disconnected
    }

    fun emit(event: String, data: JSONObject) {
        socket?.emit(event, data)
    }

    fun emit(event: String, data: JSONArray) {
        socket?.emit(event, data)
    }

    fun isConnected(): Boolean = socket?.connected() == true

    fun setSendSmsHandler(handler: (address: String, body: String) -> Unit) {
        onSendSmsRequest = handler
    }

    fun setDismissNotificationHandler(handler: (id: String) -> Unit) {
        onDismissNotificationRequest = handler
    }
}
