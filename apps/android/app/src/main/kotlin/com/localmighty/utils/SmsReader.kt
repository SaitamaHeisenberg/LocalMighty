package com.localmighty.utils

import android.content.Context
import android.provider.Telephony
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

object SmsReader {
    private const val TAG = "SmsReader"

    fun getRecentMessages(context: Context, limit: Int = 100): JSONArray {
        val messages = JSONArray()

        try {
            val cursor = context.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
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
                "${Telephony.Sms.DATE} DESC LIMIT $limit"
            )

            cursor?.use {
                val idIndex = it.getColumnIndexOrThrow(Telephony.Sms._ID)
                val threadIdIndex = it.getColumnIndexOrThrow(Telephony.Sms.THREAD_ID)
                val addressIndex = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyIndex = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val dateIndex = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
                val typeIndex = it.getColumnIndexOrThrow(Telephony.Sms.TYPE)
                val readIndex = it.getColumnIndexOrThrow(Telephony.Sms.READ)

                while (it.moveToNext()) {
                    val sms = JSONObject().apply {
                        put("id", it.getLong(idIndex).toString())
                        put("threadId", it.getString(threadIdIndex) ?: "")
                        put("address", it.getString(addressIndex) ?: "")
                        put("body", it.getString(bodyIndex) ?: "")
                        put("date", it.getLong(dateIndex))
                        put("type", getSmsType(it.getInt(typeIndex)))
                        put("read", it.getInt(readIndex) == 1)
                    }
                    messages.put(sms)
                }
            }

            Log.d(TAG, "Read ${messages.length()} messages")

        } catch (e: Exception) {
            Log.e(TAG, "Error reading SMS messages", e)
        }

        return messages
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
}
