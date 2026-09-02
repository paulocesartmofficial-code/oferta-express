package com.ofertaexpress.app.data.models

import kotlinx.serialization.Serializable

@Serializable
data class HistoryItem(
    val id: String = "",
    val productId: String? = null,
    val canonicalUrl: String,
    val originalUrl: String,
    val affiliateUrl: String,
    val title: String,
    val currentPrice: Double,
    val originalPrice: Double? = null,
    val discountPercentage: Int? = null,
    val couponCode: String? = null,
    val image: String? = null,
    val images: List<String> = emptyList(),
    val generatedMessage: String,
    val isFavorite: Boolean = false,
    val createdAt: String = ""
)

@Serializable
data class HistoryListResponse(
    val items: List<HistoryItem> = emptyList()
)

@Serializable
data class FavoriteToggleResponse(
    val id: String,
    val isFavorite: Boolean
)
