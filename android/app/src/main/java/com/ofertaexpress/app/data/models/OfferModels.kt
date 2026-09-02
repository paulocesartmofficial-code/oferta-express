package com.ofertaexpress.app.data.models

import kotlinx.serialization.Serializable

@Serializable
data class OfferPreferences(
    val style: String = "chamativo",
    val length: String = "curto",
    val emojis: String = "normal",
    val showOriginalPrice: Boolean = true,
    val showDiscountPercent: Boolean = true,
    val showRating: Boolean = true,
    val showSoldCount: Boolean = true,
    val showCoupon: Boolean = true,
    val customSignature: String = ""
)

@Serializable
data class GenerateOfferRequest(
    val product: ProductData,
    val affiliateLink: String,
    val preferences: OfferPreferences? = null,
    val action: String = "initial",
    val previousMessage: String? = null
)

@Serializable
data class GeneratedOffer(
    val title: String,
    val formattedText: String,
    val keyBenefits: List<String> = emptyList(),
    val currentPrice: Double,
    val originalPrice: Double? = null,
    val discountPercentage: Int? = null,
    val couponCode: String? = null,
    val affiliateLink: String,
    val selectedImage: String? = null,
    val callToAction: String? = null
)

@Serializable
data class PipelineOfferRequest(
    val url: String,
    val customAffiliate: String? = null,
    val preferences: OfferPreferences? = null,
    val saveToHistory: Boolean = true
)

@Serializable
data class PipelineOfferResponse(
    val success: Boolean,
    val product: ProductData? = null,
    val affiliate: ConvertAffiliateResponse? = null,
    val offer: GeneratedOffer? = null,
    val historyItem: HistoryItem? = null,
    val message: String? = null
)
