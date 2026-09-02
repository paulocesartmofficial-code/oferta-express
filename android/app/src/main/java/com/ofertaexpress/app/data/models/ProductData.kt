package com.ofertaexpress.app.data.models

import kotlinx.serialization.Serializable

@Serializable
data class ProductData(
    val productId: String? = null,
    val shopId: String? = null,
    val title: String,
    val currentPrice: Double? = null,
    val originalPrice: Double? = null,
    val discountPercentage: Int? = null,
    val rating: Double? = null,
    val reviewsCount: Int? = null,
    val soldCount: Int? = null,
    val stock: Int? = null,
    val image: String? = null,
    val images: List<String> = emptyList(),
    val source: String = "unknown",
    val canonicalUrl: String,
    val couponCode: String? = null,
    val installmentInfo: String? = null,
    val freeShipping: Boolean? = false,
    val isAvailable: Boolean = true,
    val category: String? = null
)

@Serializable
data class ResolveProductRequest(
    val url: String,
    val force: Boolean = false
)

@Serializable
data class ResolveProductResponse(
    val product: ProductData,
    val isDuplicate: Boolean = false,
    val previousItem: HistoryItem? = null
)
