package com.ofertaexpress.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ofertaexpress.app.data.models.GeneratedOffer
import com.ofertaexpress.app.data.models.ProductData
import com.ofertaexpress.app.ui.theme.*

@Composable
fun ProductOfferCard(
    product: ProductData,
    offer: GeneratedOffer,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onSaveFavorite: () -> Unit,
    isFavorite: Boolean = false,
    onAdjustTone: (String) -> Unit,
    onRegenerate: () -> Unit
) {
    var editedText by remember(offer.formattedText) { mutableStateOf(offer.formattedText) }
    var isEditing by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(28.dp))
            .background(BrandCardBg)
            .border(1.dp, BrandCardBorder, RoundedCornerShape(28.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Badges & Product Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Product Image
            val imageUrl = offer.selectedImage ?: product.image
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(BrandCardSubBg)
                    .border(1.dp, BrandCardBorder, RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (!imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = imageUrl,
                        contentDescription = product.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.ShoppingBag,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            // Title & Price Highlights
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = product.title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = TextWhite,
                    maxLines = 2
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "R$ ${String.format("%.2f", product.currentPrice)}",
                        fontWeight = FontWeight.Black,
                        fontSize = 17.sp,
                        color = BrandOrangeLight
                    )

                    product.originalPrice?.let { orig ->
                        if (orig > product.currentPrice) {
                            Text(
                                text = "R$ ${String.format("%.2f", orig)}",
                                fontSize = 12.sp,
                                color = TextMuted,
                                style = MaterialTheme.typography.bodySmall.copy(
                                    textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough
                                )
                            )
                        }
                    }

                    product.discountPercentage?.let { disc ->
                        if (disc > 0) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(BrandGreenBg)
                                    .border(1.dp, BrandGreenBorder, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "-$disc%",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    color = BrandGreen
                                )
                            }
                        }
                    }
                }
            }
        }

        // Action Quick Tone Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            listOf("direto" to "⚡ Mais Direto", "urgente" to "🔥 Mais Urgente", "detalhado" to "📝 Mais Detalhes").forEach { (tone, label) ->
                OutlinedButton(
                    onClick = { onAdjustTone(tone) },
                    modifier = Modifier.weight(1f).height(34.dp),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(BrandCardBorder)
                    ),
                    colors = ButtonDefaults.outlinedButtonColors(containerColor = BrandCardSubBg)
                ) {
                    Text(
                        text = label,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextWhite,
                        maxLines = 1
                    )
                }
            }
        }

        // WhatsApp Formatted Text Preview Box
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(BrandDarkBg)
                .border(1.dp, BrandCardBorderHover, RoundedCornerShape(18.dp))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "PRÉVIA WHATSAPP",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = BrandGreen,
                    letterSpacing = 0.5.sp
                )

                IconButton(
                    onClick = { isEditing = !isEditing },
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = if (isEditing) Icons.Default.Check else Icons.Default.Edit,
                        contentDescription = "Editar",
                        tint = TextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            if (isEditing) {
                OutlinedTextField(
                    value = editedText,
                    onValueChange = { editedText = it },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite,
                        focusedBorderColor = BrandOrange,
                        unfocusedBorderColor = BrandCardBorder
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            } else {
                Text(
                    text = editedText,
                    fontSize = 12.sp,
                    color = TextWhite,
                    lineHeight = 18.sp
                )
            }
        }

        // Primary Buttons: Copy & Share
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Copy Button
            Button(
                onClick = onCopy,
                modifier = Modifier
                    .weight(1.2f)
                    .height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandOrange)
            ) {
                Icon(
                    imageVector = Icons.Default.ContentCopy,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "COPIAR OFERTA",
                    fontWeight = FontWeight.Black,
                    fontSize = 12.sp,
                    color = Color.White
                )
            }

            // Share WhatsApp Button
            Button(
                onClick = onShare,
                modifier = Modifier
                    .weight(1.2f)
                    .height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandGreen)
            ) {
                Icon(
                    imageVector = Icons.Default.Share,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "WHATSAPP",
                    fontWeight = FontWeight.Black,
                    fontSize = 12.sp,
                    color = Color.White
                )
            }

            // Favorite Button
            IconButton(
                onClick = onSaveFavorite,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(BrandCardSubBg)
                    .border(1.dp, BrandCardBorder, RoundedCornerShape(16.dp))
            ) {
                Icon(
                    imageVector = if (isFavorite) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                    contentDescription = "Favoritar",
                    tint = if (isFavorite) BrandOrange else TextMuted
                )
            }
        }
    }
}
