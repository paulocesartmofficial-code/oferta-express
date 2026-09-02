package com.ofertaexpress.app.data.models

import kotlinx.serialization.Serializable

@Serializable
data class AppSettings(
    val defaultPreferences: OfferPreferences? = null,
    val hasGeminiKey: Boolean = false,
    val affiliateConfigured: Boolean = false,
    val shopeeAffiliateId: String? = null,
    val fallbackSubId: String? = null
)

@Serializable
data class SettingsResponse(
    val settings: AppSettings,
    val affiliateStatus: AffiliateStatus? = null
)

@Serializable
data class AffiliateStatus(
    val isConfigured: Boolean = false,
    val message: String = ""
)

@Serializable
data class HealthCheckResponse(
    val status: String,
    val appName: String,
    val geminiConfigured: Boolean = false,
    val affiliateConfigured: Boolean = false
)
