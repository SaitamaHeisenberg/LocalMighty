package com.localmighty.network

object SocketEvents {
    // Phone -> Server
    const val NEW_SMS = "new_sms"
    const val SMS_BATCH = "sms_batch"
    const val NEW_NOTIFICATION = "new_notif"
    const val NOTIF_BATCH = "notif_batch"
    const val BATTERY_UPDATE = "battery_update"
    const val PHONE_CONNECTED = "phone_connected"
    const val PHONE_DISCONNECTED = "phone_disconnected"
    const val NOTIF_DISMISSED_PHONE = "notif_dismissed_phone"
    const val CONTACTS_SYNC = "contacts_sync"
    const val SMS_SENT = "sms_sent"
    const val SMS_DELIVERED = "sms_delivered"
    const val SMS_FAILED = "sms_failed"

    // Server -> Phone
    const val SEND_SMS = "send_sms"
    const val DISMISS_NOTIFICATION = "dismiss_notif"
    const val REQUEST_SYNC = "request_sync"
}
