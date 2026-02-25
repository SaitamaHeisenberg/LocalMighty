package com.localmighty.services

import android.app.Notification
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.localmighty.network.SocketEvents
import com.localmighty.network.SocketManager
import org.json.JSONObject

class LocalMightyNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationListener"

        // Apps to ignore
        private val IGNORED_PACKAGES = setOf(
            "com.localmighty",
            "com.android.systemui",
            "android",
            "com.android.providers.downloads",
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return

        if (IGNORED_PACKAGES.contains(sbn.packageName)) return

        try {
            val notification = sbn.notification
            val extras = notification.extras

            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

            // Skip empty notifications
            if (title.isEmpty() && text.isEmpty()) return

            val appName = try {
                val appInfo = packageManager.getApplicationInfo(sbn.packageName, 0)
                packageManager.getApplicationLabel(appInfo).toString()
            } catch (e: PackageManager.NameNotFoundException) {
                sbn.packageName
            }

            val notifJson = JSONObject().apply {
                put("id", "${sbn.id}_${sbn.postTime}")
                put("packageName", sbn.packageName)
                put("appName", appName)
                put("title", title)
                put("text", text)
                put("timestamp", sbn.postTime)
                put("dismissed", false)
            }

            Log.d(TAG, "Notification from $appName: $title")
            SocketManager.emit(SocketEvents.NEW_NOTIFICATION, notifJson)

        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        sbn ?: return

        if (IGNORED_PACKAGES.contains(sbn.packageName)) return

        try {
            val dismissJson = JSONObject().apply {
                put("id", "${sbn.id}_${sbn.postTime}")
                put("packageName", sbn.packageName)
            }

            SocketManager.emit(SocketEvents.NOTIF_DISMISSED_PHONE, dismissJson)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling notification removal", e)
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification listener connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification listener disconnected")
    }
}
