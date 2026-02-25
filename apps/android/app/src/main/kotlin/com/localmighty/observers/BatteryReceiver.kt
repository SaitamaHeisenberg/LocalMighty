package com.localmighty.observers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.util.Log
import com.localmighty.network.SocketEvents
import com.localmighty.network.SocketManager
import org.json.JSONObject

class BatteryReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BatteryReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BATTERY_CHANGED) {
            sendBatteryStatus(context, intent)
        }
    }

    fun register(context: Context) {
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        context.registerReceiver(this, filter)
        Log.d(TAG, "Battery receiver registered")
    }

    fun unregister(context: Context) {
        try {
            context.unregisterReceiver(this)
            Log.d(TAG, "Battery receiver unregistered")
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering battery receiver", e)
        }
    }

    fun sendBatteryStatus(context: Context?, intent: Intent? = null) {
        val batteryIntent = intent ?: context?.registerReceiver(
            null,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        )

        batteryIntent?.let {
            val level = it.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = it.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else 0

            val status = it.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
            val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                    status == BatteryManager.BATTERY_STATUS_FULL

            val statusJson = JSONObject().apply {
                put("batteryLevel", batteryPct)
                put("isCharging", isCharging)
                put("wifiConnected", true) // Assume connected since we're communicating
                put("lastSeen", System.currentTimeMillis())
            }

            SocketManager.emit(SocketEvents.BATTERY_UPDATE, statusJson)
            Log.d(TAG, "Battery status sent: $batteryPct%, charging: $isCharging")
        }
    }
}
