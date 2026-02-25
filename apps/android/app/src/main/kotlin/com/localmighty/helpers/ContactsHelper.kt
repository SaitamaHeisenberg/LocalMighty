package com.localmighty.helpers

import android.content.Context
import android.provider.ContactsContract
import org.json.JSONArray
import org.json.JSONObject

data class Contact(
    val id: String,
    val name: String,
    val phoneNumbers: List<String>
)

object ContactsHelper {

    fun getAllContacts(context: Context): List<Contact> {
        val contacts = mutableListOf<Contact>()
        val contactsMap = mutableMapOf<String, MutableList<String>>()
        val namesMap = mutableMapOf<String, String>()

        // First, get all phone numbers with contact IDs
        val phonesCursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            ),
            null,
            null,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
        )

        phonesCursor?.use { cursor ->
            val idIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
            val nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)

            while (cursor.moveToNext()) {
                val contactId = cursor.getString(idIdx) ?: continue
                val name = cursor.getString(nameIdx) ?: "Unknown"
                val number = cursor.getString(numberIdx) ?: continue

                // Normalize phone number
                val normalizedNumber = normalizePhoneNumber(number)

                namesMap[contactId] = name
                contactsMap.getOrPut(contactId) { mutableListOf() }.add(normalizedNumber)
            }
        }

        // Build contact list
        for ((contactId, numbers) in contactsMap) {
            val name = namesMap[contactId] ?: "Unknown"
            contacts.add(Contact(contactId, name, numbers.distinct()))
        }

        return contacts
    }

    fun getContactsAsJson(context: Context): JSONArray {
        val contacts = getAllContacts(context)
        val jsonArray = JSONArray()

        for (contact in contacts) {
            val jsonObject = JSONObject().apply {
                put("id", contact.id)
                put("name", contact.name)
                put("phoneNumbers", JSONArray(contact.phoneNumbers))
            }
            jsonArray.put(jsonObject)
        }

        return jsonArray
    }

    fun findContactName(context: Context, phoneNumber: String): String? {
        val normalizedNumber = normalizePhoneNumber(phoneNumber)

        val uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
        val projection = arrayOf(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)

        // Try to find by normalized number
        val cursor = context.contentResolver.query(
            uri,
            projection,
            "${ContactsContract.CommonDataKinds.Phone.NUMBER} LIKE ?",
            arrayOf("%${normalizedNumber.takeLast(9)}%"),
            null
        )

        cursor?.use {
            if (it.moveToFirst()) {
                val nameIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                return it.getString(nameIdx)
            }
        }

        return null
    }

    private fun normalizePhoneNumber(number: String): String {
        // Remove all non-digit characters except +
        return number.replace(Regex("[^0-9+]"), "")
    }
}
