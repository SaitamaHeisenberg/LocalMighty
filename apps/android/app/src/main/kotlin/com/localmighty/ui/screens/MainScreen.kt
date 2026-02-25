package com.localmighty.ui.screens

import android.Manifest
import android.app.Activity
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.localmighty.data.AppPreferences
import com.localmighty.network.ConnectionState
import com.localmighty.network.SocketManager
import com.localmighty.services.SyncForegroundService
import com.localmighty.utils.PermissionHelper
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var serverIp by remember { mutableStateOf("192.168.1.") }
    var serverPort by remember { mutableStateOf("3001") }
    var isConnecting by remember { mutableStateOf(false) }

    val connectionState by SocketManager.connectionState.collectAsState()
    val hasPermissions = remember { mutableStateOf(PermissionHelper.hasAllPermissions(context)) }
    val hasNotificationAccess = remember { mutableStateOf(PermissionHelper.isNotificationListenerEnabled(context)) }

    // Load saved settings
    LaunchedEffect(Unit) {
        val savedUrl = AppPreferences.getServerUrl(context).first()
        savedUrl?.let { url ->
            val parts = url.removePrefix("http://").split(":")
            if (parts.size == 2) {
                serverIp = parts[0]
                serverPort = parts[1]
            }
        }
    }

    // Permission launcher
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasPermissions.value = permissions.values.all { it }
        if (!hasPermissions.value) {
            Toast.makeText(context, "Permissions requises pour fonctionner", Toast.LENGTH_SHORT).show()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("LocalMighty") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Connection Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = when (connectionState) {
                        is ConnectionState.Connected -> Color(0xFF10B981).copy(alpha = 0.1f)
                        is ConnectionState.Connecting -> Color(0xFFF59E0B).copy(alpha = 0.1f)
                        is ConnectionState.Reconnecting -> Color(0xFFF59E0B).copy(alpha = 0.1f)
                        is ConnectionState.Error -> Color(0xFFEF4444).copy(alpha = 0.1f)
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Animated indicator for connecting/reconnecting states
                        if (connectionState is ConnectionState.Connecting || connectionState is ConnectionState.Reconnecting) {
                            val infiniteTransition = rememberInfiniteTransition(label = "pulse")
                            val alpha by infiniteTransition.animateFloat(
                                initialValue = 0.3f,
                                targetValue = 1f,
                                animationSpec = infiniteRepeatable(
                                    animation = tween(500, easing = LinearEasing),
                                    repeatMode = RepeatMode.Reverse
                                ),
                                label = "pulse_alpha"
                            )
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFF59E0B).copy(alpha = alpha))
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when (connectionState) {
                                            is ConnectionState.Connected -> Color(0xFF10B981)
                                            is ConnectionState.Error -> Color(0xFFEF4444)
                                            else -> Color.Gray
                                        }
                                    )
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = when (connectionState) {
                                    is ConnectionState.Connected -> "Connecte au serveur"
                                    is ConnectionState.Connecting -> "Connexion en cours..."
                                    is ConnectionState.Reconnecting -> "Reconnexion en cours..."
                                    is ConnectionState.Error -> "Connexion echouee"
                                    else -> "Deconnecte"
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )

                            // Show reconnection attempt number
                            if (connectionState is ConnectionState.Reconnecting) {
                                Text(
                                    text = "Tentative ${(connectionState as ConnectionState.Reconnecting).attempt}...",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFFF59E0B)
                                )
                            }

                            // Show error message
                            if (connectionState is ConnectionState.Error) {
                                Text(
                                    text = (connectionState as ConnectionState.Error).message,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFFEF4444)
                                )
                            }
                        }
                    }

                    // Retry button for error state
                    if (connectionState is ConnectionState.Error) {
                        Button(
                            onClick = {
                                val serverUrl = "http://$serverIp:$serverPort"
                                scope.launch {
                                    AppPreferences.setServerUrl(context, serverUrl)
                                    SyncForegroundService.startService(context, serverUrl, null)
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFF59E0B)
                            )
                        ) {
                            Text("Reessayer la connexion")
                        }
                    }
                }
            }

            // Server Configuration
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Configuration du serveur",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    OutlinedTextField(
                        value = serverIp,
                        onValueChange = { serverIp = it },
                        label = { Text("Adresse IP du serveur") },
                        placeholder = { Text("192.168.1.100") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        enabled = connectionState !is ConnectionState.Connected && connectionState !is ConnectionState.Reconnecting
                    )

                    OutlinedTextField(
                        value = serverPort,
                        onValueChange = { serverPort = it },
                        label = { Text("Port") },
                        placeholder = { Text("3001") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        enabled = connectionState !is ConnectionState.Connected && connectionState !is ConnectionState.Reconnecting
                    )

                    Button(
                        onClick = {
                            if (connectionState is ConnectionState.Connected || connectionState is ConnectionState.Reconnecting) {
                                SyncForegroundService.stopService(context)
                            } else {
                                if (!hasPermissions.value) {
                                    permissionLauncher.launch(PermissionHelper.REQUIRED_PERMISSIONS)
                                    return@Button
                                }

                                val serverUrl = "http://$serverIp:$serverPort"
                                scope.launch {
                                    AppPreferences.setServerUrl(context, serverUrl)
                                    SyncForegroundService.startService(context, serverUrl, null)
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = when (connectionState) {
                                is ConnectionState.Connected -> Color(0xFFEF4444)
                                is ConnectionState.Reconnecting -> Color(0xFFEF4444)
                                else -> MaterialTheme.colorScheme.primary
                            }
                        )
                    ) {
                        Text(
                            when (connectionState) {
                                is ConnectionState.Connected -> "Deconnecter"
                                is ConnectionState.Reconnecting -> "Annuler"
                                else -> "Connecter"
                            }
                        )
                    }
                }
            }

            // Permissions Card
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Permissions",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    // SMS Permissions
                    PermissionRow(
                        title = "SMS",
                        description = "Lecture et envoi de SMS",
                        granted = hasPermissions.value,
                        onRequest = {
                            permissionLauncher.launch(PermissionHelper.REQUIRED_PERMISSIONS)
                        }
                    )

                    // Notification Access
                    PermissionRow(
                        title = "Notifications",
                        description = "Acces aux notifications",
                        granted = hasNotificationAccess.value,
                        onRequest = {
                            PermissionHelper.openNotificationListenerSettings(context)
                        }
                    )
                }
            }

            // Instructions
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Instructions",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "1. Lancez le serveur LocalMighty sur votre PC",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "2. Assurez-vous d'etre sur le meme reseau Wi-Fi",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "3. Entrez l'adresse IP affichee par le serveur",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "4. Accordez toutes les permissions",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "5. Appuyez sur Connecter",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            // HyperOS Note
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFFEF3C7)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Note pour Xiaomi/HyperOS",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF92400E)
                    )
                    Text(
                        text = "Activez 'Demarrage automatique' et desactivez 'Optimisation de batterie' pour LocalMighty dans les parametres.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF92400E)
                    )
                    TextButton(
                        onClick = { PermissionHelper.openAutoStartSettings(context) }
                    ) {
                        Text("Ouvrir les parametres", color = Color(0xFF92400E))
                    }
                }
            }
        }
    }
}

@Composable
fun PermissionRow(
    title: String,
    description: String,
    granted: Boolean,
    onRequest: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (granted) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF10B981)),
                contentAlignment = Alignment.Center
            ) {
                Text("✓", color = Color.White, style = MaterialTheme.typography.bodySmall)
            }
        } else {
            TextButton(onClick = onRequest) {
                Text("Autoriser")
            }
        }
    }
}
