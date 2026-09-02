package com.ofertaexpress.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ofertaexpress.app.ui.theme.*
import com.ofertaexpress.app.ui.viewmodels.ConnectionStatus
import com.ofertaexpress.app.ui.viewmodels.SettingsViewModel

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel
) {
    val backendUrl by viewModel.backendUrl.collectAsState()
    val connectionStatus by viewModel.connectionStatus.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()
    val selectedStyle by viewModel.selectedStyle.collectAsState()
    val selectedEmojis by viewModel.selectedEmojis.collectAsState()
    val customSignature by viewModel.customSignature.collectAsState()
    val isSaved by viewModel.isSaved.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandDarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Backend Status & Development Mode Card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(28.dp))
                .background(BrandCardBg)
                .border(1.dp, BrandCardBorder, RoundedCornerShape(28.dp))
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(BrandOrangeBg)
                        .border(1.dp, BrandOrangeDark, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Dns,
                        contentDescription = "Backend",
                        tint = BrandOrangeHover,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column {
                    Text(
                        text = "MODO DESENVOLVIMENTO",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = TextWhite
                    )
                    Text(
                        text = "Configuração do servidor do APK",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
            }

            // Connection Status Banner
            when (connectionStatus) {
                is ConnectionStatus.Testing -> {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(BrandBlueBg)
                            .border(1.dp, BrandBlueBorder, RoundedCornerShape(16.dp))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), color = BrandBlue, strokeWidth = 2.dp)
                        Text(text = "Testando conexão com o servidor...", fontSize = 12.sp, color = BrandBlue)
                    }
                }
                is ConnectionStatus.Connected -> {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(BrandGreenBg)
                            .border(1.dp, BrandGreenBorder, RoundedCornerShape(16.dp))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(BrandGreen))
                        Text(text = "🟢 Conectado ao Backend", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandGreen)
                    }
                }
                is ConnectionStatus.Error -> {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(BrandRedBg)
                            .border(1.dp, BrandRedBorder, RoundedCornerShape(16.dp))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Warning, contentDescription = "Erro", tint = BrandRed, modifier = Modifier.size(16.dp))
                        Text(text = (connectionStatus as ConnectionStatus.Error).message, fontSize = 11.sp, color = TextWhite)
                    }
                }
                else -> {}
            }

            // Backend URL Field
            OutlinedTextField(
                value = backendUrl,
                onValueChange = { viewModel.setBackendUrl(it) },
                label = { Text("URL do Backend (ex: https://meu-backend.run.app)", color = TextMuted, fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = BrandOrange,
                    unfocusedBorderColor = BrandCardBorder,
                    focusedContainerColor = BrandCardSubBg,
                    unfocusedContainerColor = BrandCardSubBg
                ),
                shape = RoundedCornerShape(16.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { viewModel.saveSettings() },
                    modifier = Modifier.weight(1f).height(46.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandOrange)
                ) {
                    Text(text = if (isSaved) "✅ Salvo!" else "💾 Salvar URL", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                }

                OutlinedButton(
                    onClick = { viewModel.testConnection() },
                    modifier = Modifier.weight(1f).height(46.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(BrandCardBorder)),
                    colors = ButtonDefaults.outlinedButtonColors(containerColor = BrandCardSubBg)
                ) {
                    Text(text = "🧪 Testar Conexão", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextWhite)
                }
            }

            // Backend Features Status List
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(BrandCardSubBg)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Shopee Afiliados:", fontSize = 12.sp, color = TextMuted)
                    Text(
                        text = if (appSettings?.affiliateConfigured == true) "🟢 Configurado" else "🟡 Manual / Preservado",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (appSettings?.affiliateConfigured == true) BrandGreen else Color(0xFFFBBF24)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Inteligência Artificial (Gemini):", fontSize = 12.sp, color = TextMuted)
                    Text(
                        text = if (appSettings?.hasGeminiKey == true) "🟢 Ativo no Servidor" else "🟡 Modelo Padrão",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (appSettings?.hasGeminiKey == true) BrandGreen else Color(0xFFFBBF24)
                    )
                }
            }
        }

        // 2. Preferences & Tone Card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(28.dp))
                .background(BrandCardBg)
                .border(1.dp, BrandCardBorder, RoundedCornerShape(28.dp))
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(BrandOrangeBg)
                        .border(1.dp, BrandOrangeDark, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = "Estilo",
                        tint = BrandOrangeHover,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column {
                    Text(
                        text = "PADRÕES DE REDAÇÃO WHATSAPP",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = TextWhite
                    )
                    Text(
                        text = "Tom das ofertas e estilo dos emojis",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
            }

            Text("Estilo da Mensagem:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf("direto" to "⚡ Direto", "urgente" to "🔥 Urgente", "detalhado" to "📝 Detalhado").forEach { (key, label) ->
                    val isSelected = selectedStyle == key
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isSelected) BrandOrangeBg else BrandCardSubBg)
                            .border(1.dp, if (isSelected) BrandOrange else BrandCardBorder, RoundedCornerShape(14.dp))
                            .clickable { viewModel.setStyle(key) }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) BrandOrangeHover else TextMuted
                        )
                    }
                }
            }

            Text("Quantidade de Emojis:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf("pouco" to "Discreto", "moderado" to "Moderado", "muito" to "Muitos").forEach { (key, label) ->
                    val isSelected = selectedEmojis == key
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isSelected) BrandOrangeBg else BrandCardSubBg)
                            .border(1.dp, if (isSelected) BrandOrange else BrandCardBorder, RoundedCornerShape(14.dp))
                            .clickable { viewModel.setEmojis(key) }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) BrandOrangeHover else TextMuted
                        )
                    }
                }
            }

            // Custom Signature Field
            OutlinedTextField(
                value = customSignature,
                onValueChange = { viewModel.setCustomSignature(it) },
                label = { Text("Assinatura / Link do Grupo VIP (Opcional)", color = TextMuted, fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = BrandOrange,
                    unfocusedBorderColor = BrandCardBorder,
                    focusedContainerColor = BrandCardSubBg,
                    unfocusedContainerColor = BrandCardSubBg
                ),
                shape = RoundedCornerShape(16.dp)
            )

            Button(
                onClick = { viewModel.saveSettings() },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandOrange)
            ) {
                Text(text = if (isSaved) "✅ Preferências Salvas!" else "SALVAR PREFERÊNCIAS", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color.White)
            }
        }
    }
}
