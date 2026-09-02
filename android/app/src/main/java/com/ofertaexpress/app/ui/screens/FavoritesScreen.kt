package com.ofertaexpress.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ofertaexpress.app.data.api.ApiClient
import com.ofertaexpress.app.ui.theme.*
import com.ofertaexpress.app.ui.viewmodels.FavoritesViewModel
import com.ofertaexpress.app.utils.ShareUtils
import kotlinx.coroutines.launch

@Composable
fun FavoritesScreen(
    viewModel: FavoritesViewModel,
    onRegenerate: (String) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val items by viewModel.items.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandDarkBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(
            text = "⭐ OFERTAS SALVAS NOS FAVORITOS",
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            color = TextMuted,
            letterSpacing = 0.5.sp
        )

        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = BrandOrange)
            }
        } else if (items.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.BookmarkBorder,
                        contentDescription = "Vazio",
                        tint = TextSubtle,
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = "Nenhuma oferta favoritada ainda",
                        color = TextMuted,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Toque no ícone de marcador para salvar",
                        color = TextSubtle,
                        fontSize = 12.sp
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(items, key = { it.id }) { item ->
                    HistoryItemCard(
                        item = item,
                        onCopy = { ShareUtils.copyToClipboard(context, item.generatedMessage, "Oferta Shopee") },
                        onShare = {
                            coroutineScope.launch {
                                ShareUtils.shareOfferWithImage(
                                    context,
                                    ApiClient.getOkHttpClient(),
                                    item.image,
                                    item.generatedMessage
                                )
                            }
                        },
                        onToggleFavorite = { viewModel.toggleFavorite(item.id) },
                        onDelete = { viewModel.toggleFavorite(item.id) },
                        onRegenerate = { onRegenerate(item.canonicalUrl) }
                    )
                }
            }
        }
    }
}
