package com.ofertaexpress.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ofertaexpress.app.ui.theme.*

@Composable
fun TopAppHeader(
    isOnline: Boolean,
    affiliateConfigured: Boolean,
    geminiReady: Boolean
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BrandCardBg)
            .border(1.dp, BrandCardBorder)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Logo & Title
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(BrandOrange)
                    .border(1.dp, BrandOrangeLight, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.LocalOffer,
                    contentDescription = "Oferta Express",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }

            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "OFERTA",
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        color = TextWhite,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = "EXPRESS",
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        color = BrandOrange,
                        letterSpacing = 0.5.sp
                    )
                }
                Text(
                    text = "Gerador de Ofertas Shopee",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextMuted
                )
            }
        }

        // Live Badges
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Shopee Badge
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (affiliateConfigured) BrandGreenBg else BrandCardSubBg)
                    .border(1.dp, if (affiliateConfigured) BrandGreenBorder else BrandCardBorder, RoundedCornerShape(8.dp))
                    .padding(horizontal = 6.dp, vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ShoppingBag,
                    contentDescription = "Shopee",
                    tint = if (affiliateConfigured) BrandGreen else TextMuted,
                    modifier = Modifier.size(12.dp)
                )
                Text(
                    text = "SHOPEE",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (affiliateConfigured) BrandGreen else TextMuted
                )
            }

            // Gemini AI Badge
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (geminiReady) BrandOrangeBg else BrandCardSubBg)
                    .border(1.dp, if (geminiReady) BrandOrangeDark else BrandCardBorder, RoundedCornerShape(8.dp))
                    .padding(horizontal = 6.dp, vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = "IA",
                    tint = if (geminiReady) BrandOrangeLight else TextMuted,
                    modifier = Modifier.size(12.dp)
                )
                Text(
                    text = "IA",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (geminiReady) BrandOrangeLight else TextMuted
                )
            }

            // Connection Indicator
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(if (isOnline) BrandGreen else BrandRed)
            )
        }
    }
}
