package com.ofertaexpress.app.data.models

import kotlinx.serialization.Serializable

@Serializable
data class ConvertAffiliateRequest(
    val productUrl: String,
    val customAffiliateUrl: String? = null
)

@Serializable
data class ConvertAffiliateResponse(
    val originalUrl: String,
    val affiliateUrl: String,
    val isSubIdAttached: Boolean = false,
    val source: String = "preserved"
)
