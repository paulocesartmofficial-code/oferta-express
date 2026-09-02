package com.ofertaexpress.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.ofertaexpress.app.ui.theme.*

@Composable
fun AssistedManualDialog(
    initialUrl: String,
    onDismiss: () -> Unit,
    onSubmit: (title: String, price: Double, originalPrice: Double?, discount: Int?, coupon: String?) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var priceStr by remember { mutableStateOf("") }
    var origPriceStr by remember { mutableStateOf("") }
    var coupon by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(BrandCardBg)
                .border(1.dp, BrandCardBorder, RoundedCornerShape(24.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = null,
                    tint = BrandOrange,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = "Preenchimento Assistido",
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    color = TextWhite
                )
            }

            Text(
                text = "Não foi possível carregar os dados automáticos. Digite os dados básicos:",
                fontSize = 11.sp,
                color = TextMuted
            )

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Nome do Produto", color = TextMuted, fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = BrandOrange,
                    unfocusedBorderColor = BrandCardBorder
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = priceStr,
                    onValueChange = { priceStr = it },
                    label = { Text("Preço Atual (R$)", color = TextMuted, fontSize = 11.sp) },
                    modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite,
                        focusedBorderColor = BrandOrange,
                        unfocusedBorderColor = BrandCardBorder
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = origPriceStr,
                    onValueChange = { origPriceStr = it },
                    label = { Text("De (R$) Opcional", color = TextMuted, fontSize = 11.sp) },
                    modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite,
                        focusedBorderColor = BrandOrange,
                        unfocusedBorderColor = BrandCardBorder
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }

            OutlinedTextField(
                value = coupon,
                onValueChange = { coupon = it },
                label = { Text("Cupom (Opcional)", color = TextMuted, fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = BrandOrange,
                    unfocusedBorderColor = BrandCardBorder
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f).height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(BrandCardBorder)
                    )
                ) {
                    Text("Cancelar", color = TextMuted, fontSize = 12.sp)
                }

                Button(
                    onClick = {
                        val currentPrice = priceStr.replace(",", ".").toDoubleOrNull() ?: 0.0
                        val originalPrice = origPriceStr.replace(",", ".").toDoubleOrNull()
                        val discount = if (originalPrice != null && originalPrice > currentPrice && currentPrice > 0) {
                            (((originalPrice - currentPrice) / originalPrice) * 100).toInt()
                        } else null

                        if (title.isNotBlank() && currentPrice > 0) {
                            onSubmit(title, currentPrice, originalPrice, discount, coupon.ifBlank { null })
                        }
                    },
                    modifier = Modifier.weight(1f).height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandOrange)
                ) {
                    Text("Gerar Oferta", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 12.sp)
                }
            }
        }
    }
}
