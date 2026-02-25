package com.localmighty.services

import android.app.Notification
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.localmighty.network.SocketEvents
import com.localmighty.network.SocketManager
import org.json.JSONObject

class LocalMightyNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationListener"
        private var instance: LocalMightyNotificationListener? = null

        // Apps to ignore
        private val IGNORED_PACKAGES = setOf(
            "com.localmighty",
            "com.android.systemui",
            "android",
            "com.android.providers.downloads",
        )

        // Store reply actions for notifications
        private val replyActions = mutableMapOf<String, ReplyAction>()

        fun replyToNotification(notificationId: String, message: String): Boolean {
            val action = replyActions[notificationId]
            if (action == null) {
                Log.e(TAG, "No reply action found for notification: $notificationId")
                return false
            }

            return try {
                val intent = Intent()
                val bundle = Bundle()
                bundle.putCharSequence(action.remoteInputKey, message)
                RemoteInput.addResultsToIntent(arrayOf(action.remoteInput), intent, bundle)
                action.pendingIntent.send(instance, 0, intent)
                Log.d(TAG, "Reply sent successfully to $notificationId")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send reply", e)
                false
            }
        }
    }

    data class ReplyAction(
        val pendingIntent: PendingIntent,
        val remoteInput: RemoteInput,
        val remoteInputKey: String
    )

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
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

            val notificationId = "${sbn.id}_${sbn.postTime}"

            // Check for reply action
            var canReply = false
            notification.actions?.forEach { action ->
                action.remoteInputs?.forEach { remoteInput ->
                    if (remoteInput.allowFreeFormInput) {
                        canReply = true
                        // Store the reply action
                        replyActions[notificationId] = ReplyAction(
                            pendingIntent = action.actionIntent,
                            remoteInput = remoteInput,
                            remoteInputKey = remoteInput.resultKey
                        )
                        Log.d(TAG, "Found reply action for $appName notification")
                    }
                }
            }

            val notifJson = JSONObject().apply {
                put("id", notificationId)
                put("packageName", sbn.packageName)
                put("appName", appName)
                put("title", title)
                put("text", text)
                put("timestamp", sbn.postTime)
                put("dismissed", false)
                put("canReply", canReply)
            }

            Log.d(TAG, "Notification from $appName: $title (canReply: $canReply)")
            SocketManager.emit(SocketEvents.NEW_NOTIFICATION, notifJson)

        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        sbn ?: return

        if (IGNORED_PACKAGES.contains(sbn.packageName)) return

        try {
            val notificationId = "${sbn.id}_${sbn.postTime}"

            // Clean up stored reply action
            replyActions.remove(notificationId)

            val dismissJson = JSONObject().apply {
                put("id", notificationId)
                put("packageName", sbn.packageName)
            }

            SocketManager.emit(SocketEvents.NOTIF_DISMISSED_PHONE, dismissJson)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling notification removal", e)
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.d(TAG, "Notification listener connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification listener disconnected")
    }
}
