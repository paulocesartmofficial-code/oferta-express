package com.ofertaexpress.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Layers
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

@Composable
fun BatchOffersScreen(
    onBack: () -> Unit,
    onProcessBatch: (List<String>) -> Unit
) {
    var rawText by remember { mutableStateOf("") }

    val urls = remember(rawText) {
        rawText.lines()
            .map { it.trim() }
            .filter { it.isNotBlank() && (it.contains("shopee.com") || it.contains("shope.ee")) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandDarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Voltar", tint = TextWhite)
            }
            Column {
                Text("MODO LOTE", fontWeight = FontWeight.Black, fontSize = 16.sp, color = TextWhite)
                Text("Processe múltiplos links de uma só vez", fontSize = 11.sp, color = TextMuted)
            }
        }

        // Input Box
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(28.dp))
                .background(BrandCardBg)
                .border(1.dp, BrandCardBorder, RoundedCornerShape(28.dp))
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = "COLE UM LINK POR LINHA:",
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                color = TextMuted
            )

            OutlinedTextField(
                value = rawText,
                onValueChange = { rawText = it },
                placeholder = {
                    Text(
                        "https://shopee.com.br/...\nhttps://s.shopee.com.br/...\nhttps://shopee.com.br/...",
                        color = TextSubtle,
                        fontSize = 12.sp
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
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
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${urls.size} links detectados",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (urls.isNotEmpty()) BrandGreen else TextSubtle
                )

                if (rawText.isNotBlank()) {
                    TextButton(onClick = { rawText = "" }) {
                        Text("Limpar", color = TextMuted, fontSize = 11.sp)
                    }
                }
            }

            Button(
                onClick = {
                    if (urls.isNotEmpty()) {
                        onProcessBatch(urls)
                    }
                },
                enabled = urls.isNotEmpty(),
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandOrange)
            ) {
                Icon(imageVector = Icons.Default.Layers, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = "PROCESSAR ${urls.size} LINKS", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color.White)
            }
        }
    }
}
