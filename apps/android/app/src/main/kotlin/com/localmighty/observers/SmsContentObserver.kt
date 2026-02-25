package com.localmighty.observers

import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.provider.Telephony
import android.util.Log
import com.localmighty.network.SocketEvents
import com.localmighty.network.SocketManager
import org.json.JSONObject

class SmsContentObserver(
    private val context: Context,
    handler: Handler
) : ContentObserver(handler) {

    companion object {
        private const val TAG = "SmsContentObserver"
        private val SMS_URI = Uri.parse("content://sms/")
    }

    private var lastSmsId: Long = -1

    override fun onChange(selfChange: Boolean, uri: Uri?) {
        super.onChange(selfChange, uri)
        Log.d(TAG, "SMS change detected: $uri")

        try {
            val cursor = context.contentResolver.query(
                SMS_URI,
                arrayOf(
                    Telephony.Sms._ID,
                    Telephony.Sms.THREAD_ID,
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.DATE,
                    Telephony.Sms.TYPE,
                    Telephony.Sms.READ
                ),
                null,
                null,
                "${Telephony.Sms.DATE} DESC LIMIT 1"
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val id = it.getLong(it.getColumnIndexOrThrow(Telephony.Sms._ID))

                    // Avoid duplicate events
                    if (id != lastSmsId) {
                        lastSmsId = id

                        val smsJson = JSONObject().apply {
                            put("id", id.toString())
                            put("threadId", it.getString(it.getColumnIndexOrThrow(Telephony.Sms.THREAD_ID)) ?: "")
                            put("address", it.getString(it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)) ?: "")
                            put("body", it.getString(it.getColumnIndexOrThrow(Telephony.Sms.BODY)) ?: "")
                            put("date", it.getLong(it.getColumnIndexOrThrow(Telephony.Sms.DATE)))
                            put("type", getSmsType(it.getInt(it.getColumnIndexOrThrow(Telephony.Sms.TYPE))))
                            put("read", it.getInt(it.getColumnIndexOrThrow(Telephony.Sms.READ)) == 1)
                        }

                        Log.d(TAG, "New SMS: ${smsJson.optString("address")}")
                        SocketManager.emit(SocketEvents.NEW_SMS, smsJson)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading SMS", e)
        }
    }

    private fun getSmsType(type: Int): String {
        return when (type) {
            Telephony.Sms.MESSAGE_TYPE_INBOX -> "inbox"
            Telephony.Sms.MESSAGE_TYPE_SENT -> "sent"
            Telephony.Sms.MESSAGE_TYPE_DRAFT -> "draft"
            Telephony.Sms.MESSAGE_TYPE_OUTBOX -> "outbox"
            else -> "unknown"
        }
    }

    fun register() {
        context.contentResolver.registerContentObserver(SMS_URI, true, this)
        Log.d(TAG, "SMS observer registered")
    }

    fun unregister() {
        context.contentResolver.unregisterContentObserver(this)
        Log.d(TAG, "SMS observer unregistered")
    }
}
