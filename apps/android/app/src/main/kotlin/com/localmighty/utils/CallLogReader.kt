package com.localmighty.utils

import android.content.Context
import android.provider.CallLog
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

object CallLogReader {
    private const val TAG = "CallLogReader"

    fun getRecentCalls(context: Context, limit: Int = 100): JSONArray {
        val calls = JSONArray()

        try {
            val cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls._ID,
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.CACHED_NAME,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DATE,
                    CallLog.Calls.DURATION
                ),
                null,
                null,
                "${CallLog.Calls.DATE} DESC LIMIT $limit"
            )

            cursor?.use {
                val idIndex = it.getColumnIndexOrThrow(CallLog.Calls._ID)
                val numberIndex = it.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
                val nameIndex = it.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)
                val typeIndex = it.getColumnIndexOrThrow(CallLog.Calls.TYPE)
                val dateIndex = it.getColumnIndexOrThrow(CallLog.Calls.DATE)
                val durationIndex = it.getColumnIndexOrThrow(CallLog.Calls.DURATION)

                while (it.moveToNext()) {
                    val call = JSONObject().apply {
                        put("id", it.getLong(idIndex).toString())
                        put("number", it.getString(numberIndex) ?: "")
                        put("contactName", it.getString(nameIndex))
                        put("type", getCallType(it.getInt(typeIndex)))
                        put("date", it.getLong(dateIndex))
                        put("duration", it.getLong(durationIndex))
                    }
                    calls.put(call)
                }
            }

            Log.d(TAG, "Read ${calls.length()} call log entries")

        } catch (e: Exception) {
            Log.e(TAG, "Error reading call log", e)
        }

        return calls
    }

    private fun getCallType(type: Int): String {
        return when (type) {
            CallLog.Calls.INCOMING_TYPE -> "incoming"
            CallLog.Calls.OUTGOING_TYPE -> "outgoing"
            CallLog.Calls.MISSED_TYPE -> "missed"
            CallLog.Calls.REJECTED_TYPE -> "rejected"
            CallLog.Calls.VOICEMAIL_TYPE -> "voicemail"
            else -> "incoming"
        }
    }
}
