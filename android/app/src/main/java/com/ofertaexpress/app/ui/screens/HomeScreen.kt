package com.ofertaexpress.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ofertaexpress.app.data.api.ApiClient
import com.ofertaexpress.app.ui.components.AssistedManualDialog
import com.ofertaexpress.app.ui.components.ProductOfferCard
import com.ofertaexpress.app.ui.components.StepProgressIndicator
import com.ofertaexpress.app.ui.theme.*
import com.ofertaexpress.app.ui.viewmodels.HomeUiState
import com.ofertaexpress.app.ui.viewmodels.HomeViewModel
import com.ofertaexpress.app.utils.ShareUtils
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onNavigateToBatch: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val coroutineScope = rememberCoroutineScope()

    val uiState by viewModel.uiState.collectAsState()
    val inputUrl by viewModel.inputUrl.collectAsState()
    val customAffiliateUrl by viewModel.customAffiliateUrl.collectAsState()

    var showManualDialog by remember { mutableStateOf(false) }
    var showAdvancedAffiliate by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandDarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Quick Action Mode Switcher
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(BrandOrangeBg)
                    .border(1.dp, BrandOrange, RoundedCornerShape(16.dp))
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "⚡ Oferta Única",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = BrandOrangeLight
                )
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(BrandCardSubBg)
                    .border(1.dp, BrandCardBorder, RoundedCornerShape(16.dp))
                    .clickable { onNavigateToBatch() }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "📑 Modo Lote",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted
                )
            }
        }

        // Main Input Card
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
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "LINK DO PRODUTO SHOPEE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    color = TextMuted,
                    letterSpacing = 0.5.sp
                )

                // Paste from clipboard button
                TextButton(
                    onClick = {
                        val clip = clipboardManager.getText()
                        if (!clip.isNullOrBlank()) {
                            viewModel.setInputUrl(clip.text.trim())
                        }
                    },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.ContentPaste,
                        contentDescription = "Colar",
                        tint = BrandOrangeLight,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Colar",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandOrangeLight
                    )
                }
            }

            // URL Input Field
            OutlinedTextField(
                value = inputUrl,
                onValueChange = { viewModel.setInputUrl(it) },
                placeholder = {
                    Text(
                        "Cole https://shopee.com.br/... ou link curto",
                        color = TextSubtle,
                        fontSize = 12.sp
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = BrandOrange,
                    unfocusedBorderColor = BrandCardBorder,
                    focusedContainerColor = BrandCardSubBg,
                    unfocusedContainerColor = BrandCardSubBg
                ),
                shape = RoundedCornerShape(16.dp),
                trailingIcon = {
                    if (inputUrl.isNotBlank()) {
                        IconButton(onClick = { viewModel.setInputUrl("") }) {
                            Icon(imageVector = Icons.Default.Clear, contentDescription = "Limpar", tint = TextMuted)
                        }
                    }
                }
            )

            // Optional Affiliate Link Toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showAdvancedAffiliate = !showAdvancedAffiliate },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = if (showAdvancedAffiliate) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "Link de afiliado personalizado (Opcional)",
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }

            if (showAdvancedAffiliate) {
                OutlinedTextField(
                    value = customAffiliateUrl,
                    onValueChange = { viewModel.setCustomAffiliateUrl(it) },
                    placeholder = {
                        Text(
                            "Cole seu link gerado no Programa de Afiliados",
                            color = TextSubtle,
                            fontSize = 11.sp
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite,
                        focusedBorderColor = BrandOrange,
                        unfocusedBorderColor = BrandCardBorder,
                        focusedContainerColor = BrandCardSubBg,
                        unfocusedContainerColor = BrandCardSubBg
                    ),
                    shape = RoundedCornerShape(14.dp)
                )
            }

            // Generate Button
            Button(
                onClick = { viewModel.generateOffer() },
                enabled = inputUrl.isNotBlank() && uiState !is HomeUiState.Processing,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandOrange,
                    disabledContainerColor = BrandCardSubBg
                )
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "GERAR OFERTA WHATSAPP",
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp,
                    color = Color.White
                )
            }
        }

        // Active State Display
        when (val state = uiState) {
            is HomeUiState.Processing -> {
                StepProgressIndicator(currentStep = state.step)
            }

            is HomeUiState.Success -> {
                ProductOfferCard(
                    product = state.product,
                    offer = state.offer,
                    isFavorite = state.isFavorite,
                    onCopy = {
                        ShareUtils.copyToClipboard(
                            context = context,
                            text = state.offer.formattedText,
                            label = "Oferta ${state.product.title}"
                        )
                    },
                    onShare = {
                        coroutineScope.launch {
                            ShareUtils.shareOfferWithImage(
                                context = context,
                                okHttpClient = ApiClient.getOkHttpClient(),
                                imageUrl = state.offer.selectedImage ?: state.product.image,
                                messageText = state.offer.formattedText
                            )
                        }
                    },
                    onSaveFavorite = { viewModel.toggleFavorite() },
                    onAdjustTone = { tone -> viewModel.adjustTone(tone) },
                    onRegenerate = { viewModel.generateOffer() }
                )
            }

            is HomeUiState.Error -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(BrandRedBg)
                        .border(1.dp, BrandRedBorder, RoundedCornerShape(20.dp))
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Atenção",
                            tint = BrandRed,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "Aviso ao Processar",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = TextWhite
                        )
                    }

                    Text(
                        text = state.message,
                        fontSize = 12.sp,
                        color = TextWhite,
                        lineHeight = 16.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (state.canTryManual) {
                            Button(
                                onClick = { showManualDialog = true },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandOrange),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = "Preenchimento Assistido",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }

                        OutlinedButton(
                            onClick = onNavigateToSettings,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = "Configurações",
                                fontSize = 11.sp,
                                color = TextWhite
                            )
                        }
                    }
                }
            }

            else -> {}
        }
    }

    if (showManualDialog) {
        AssistedManualDialog(
            initialUrl = inputUrl,
            onDismiss = { showManualDialog = false },
            onSubmit = { title, price, orig, disc, coupon ->
                showManualDialog = false
                viewModel.generateManualOffer(title, price, orig, disc, coupon)
            }
        )
    }
}
