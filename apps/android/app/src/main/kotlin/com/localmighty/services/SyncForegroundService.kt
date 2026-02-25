package com.localmighty.services

import android.app.Activity
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.localmighty.LocalMightyApp
import com.localmighty.MainActivity
import com.localmighty.R
import com.localmighty.network.SocketEvents
import com.localmighty.network.SocketManager
import com.localmighty.helpers.ContactsHelper
import com.localmighty.observers.BatteryReceiver
import com.localmighty.observers.SmsContentObserver
import com.localmighty.utils.SmsReader
import org.json.JSONObject

class SyncForegroundService : Service() {

    companion object {
        private const val TAG = "SyncForegroundService"
        private const val NOTIFICATION_ID = 1001
        private const val HEARTBEAT_INTERVAL = 30_000L // 30 seconds

        const val ACTION_START = "com.localmighty.START_SYNC"
        const val ACTION_STOP = "com.localmighty.STOP_SYNC"
        const val EXTRA_SERVER_URL = "server_url"
        const val EXTRA_TOKEN = "token"

        fun startService(context: Context, serverUrl: String, token: String?) {
            val intent = Intent(context, SyncForegroundService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_SERVER_URL, serverUrl)
                putExtra(EXTRA_TOKEN, token)
            }
            context.startForegroundService(intent)
        }

        fun stopService(context: Context) {
            val intent = Intent(context, SyncForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    private lateinit var smsObserver: SmsContentObserver
    private lateinit var batteryReceiver: BatteryReceiver
    private val handler = Handler(Looper.getMainLooper())
    private var heartbeatRunnable: Runnable? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")

        smsObserver = SmsContentObserver(this, handler)
        batteryReceiver = BatteryReceiver()

        // Handle SMS send requests
        SocketManager.setSendSmsHandler { address, body ->
            sendSms(address, body)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val serverUrl = intent.getStringExtra(EXTRA_SERVER_URL) ?: return START_NOT_STICKY
                val token = intent.getStringExtra(EXTRA_TOKEN)

                startForeground(NOTIFICATION_ID, createNotification())
                startSync(serverUrl, token)
            }
            ACTION_STOP -> {
                stopSync()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }

        return START_STICKY
    }

    private fun startSync(serverUrl: String, token: String?) {
        Log.d(TAG, "Starting sync with $serverUrl")

        // Connect to server
        SocketManager.connect(serverUrl, token)

        // Register observers
        smsObserver.register()
        batteryReceiver.register(this)

        // Perform initial sync
        performInitialSync()

        // Start heartbeat
        startHeartbeat()
    }

    private fun stopSync() {
        Log.d(TAG, "Stopping sync")

        smsObserver.unregister()
        batteryReceiver.unregister(this)
        stopHeartbeat()
        SocketManager.disconnect()
    }

    private fun performInitialSync() {
        Thread {
            try {
                // Sync SMS
                val recentSms = SmsReader.getRecentMessages(this, limit = 100)
                SocketManager.emit("sms_batch", recentSms)
                Log.d(TAG, "Initial SMS sync: ${recentSms.length()} messages")

                // Sync contacts
                val contacts = ContactsHelper.getContactsAsJson(this)
                SocketManager.emit("contacts_sync", contacts)
                Log.d(TAG, "Contacts sync: ${contacts.length()} contacts")
            } catch (e: Exception) {
                Log.e(TAG, "Initial sync failed", e)
            }
        }.start()
    }

    private fun startHeartbeat() {
        heartbeatRunnable = object : Runnable {
            override fun run() {
                batteryReceiver.sendBatteryStatus(this@SyncForegroundService)
                handler.postDelayed(this, HEARTBEAT_INTERVAL)
            }
        }
        handler.postDelayed(heartbeatRunnable!!, HEARTBEAT_INTERVAL)
    }

    private fun stopHeartbeat() {
        heartbeatRunnable?.let { handler.removeCallbacks(it) }
        heartbeatRunnable = null
    }

    private var smsRequestCode = 0

    private fun sendSms(address: String, body: String) {
        try {
            val smsManager = getSystemService(SmsManager::class.java)
            val parts = smsManager.divideMessage(body)
            val messageId = System.currentTimeMillis().toString()

            // Create sent intent
            val sentAction = "SMS_SENT_$messageId"
            val sentIntent = PendingIntent.getBroadcast(
                this,
                smsRequestCode++,
                Intent(sentAction),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            // Create delivered intent
            val deliveredAction = "SMS_DELIVERED_$messageId"
            val deliveredIntent = PendingIntent.getBroadcast(
                this,
                smsRequestCode++,
                Intent(deliveredAction),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            // Register sent receiver
            registerReceiver(object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val status = JSONObject().apply {
                        put("messageId", messageId)
                        put("address", address)
                    }
                    when (resultCode) {
                        Activity.RESULT_OK -> {
                            Log.d(TAG, "SMS sent successfully to $address")
                            SocketManager.emit(SocketEvents.SMS_SENT, status)
                        }
                        else -> {
                            Log.e(TAG, "SMS send failed to $address, result: $resultCode")
                            status.put("error", "Send failed: $resultCode")
                            SocketManager.emit(SocketEvents.SMS_FAILED, status)
                        }
                    }
                    try { unregisterReceiver(this) } catch (_: Exception) {}
                }
            }, IntentFilter(sentAction), RECEIVER_NOT_EXPORTED)

            // Register delivered receiver
            registerReceiver(object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val status = JSONObject().apply {
                        put("messageId", messageId)
                        put("address", address)
                    }
                    when (resultCode) {
                        Activity.RESULT_OK -> {
                            Log.d(TAG, "SMS delivered to $address")
                            SocketManager.emit(SocketEvents.SMS_DELIVERED, status)
                        }
                        else -> {
                            Log.d(TAG, "SMS not delivered to $address, result: $resultCode")
                        }
                    }
                    try { unregisterReceiver(this) } catch (_: Exception) {}
                }
            }, IntentFilter(deliveredAction), RECEIVER_NOT_EXPORTED)

            if (parts.size == 1) {
                smsManager.sendTextMessage(address, null, body, sentIntent, deliveredIntent)
            } else {
                val sentIntents = ArrayList<PendingIntent>().apply { repeat(parts.size) { add(sentIntent) } }
                val deliveredIntents = ArrayList<PendingIntent>().apply { repeat(parts.size) { add(deliveredIntent) } }
                smsManager.sendMultipartTextMessage(address, null, parts, sentIntents, deliveredIntents)
            }

            Log.d(TAG, "SMS sending to $address (id: $messageId)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send SMS", e)
            val status = JSONObject().apply {
                put("address", address)
                put("error", e.message)
            }
            SocketManager.emit(SocketEvents.SMS_FAILED, status)
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, LocalMightyApp.SYNC_CHANNEL_ID)
            .setContentTitle("LocalMighty")
            .setContentText("Synchronisation avec le PC...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopSync()
        Log.d(TAG, "Service destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
