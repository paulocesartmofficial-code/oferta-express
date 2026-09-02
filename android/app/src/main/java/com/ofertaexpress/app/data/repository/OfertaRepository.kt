package com.ofertaexpress.app.data.repository

import com.ofertaexpress.app.data.api.ApiClient
import com.ofertaexpress.app.data.api.OfertaExpressApiService
import com.ofertaexpress.app.data.models.*

class OfertaRepository(private var baseUrl: String) {

    private var api: OfertaExpressApiService = ApiClient.createService(baseUrl)

    fun updateBaseUrl(newUrl: String) {
        if (newUrl.isNotBlank() && newUrl != baseUrl) {
            baseUrl = newUrl
            api = ApiClient.createService(baseUrl)
        }
    }

    suspend fun healthCheck(): Result<HealthCheckResponse> = runCatching {
        api.healthCheck()
    }

    suspend fun resolveProduct(url: String, force: Boolean = false): Result<ResolveProductResponse> = runCatching {
        api.resolveProduct(ResolveProductRequest(url = url, force = force))
    }

    suspend fun convertAffiliate(productUrl: String, customAffiliateUrl: String? = null): Result<ConvertAffiliateResponse> = runCatching {
        api.convertAffiliate(ConvertAffiliateRequest(productUrl = productUrl, customAffiliateUrl = customAffiliateUrl))
    }

    suspend fun generateOffer(
        product: ProductData,
        affiliateLink: String,
        preferences: OfferPreferences? = null,
        action: String = "initial",
        previousMessage: String? = null
    ): Result<GeneratedOffer> = runCatching {
        api.generateOffer(
            GenerateOfferRequest(
                product = product,
                affiliateLink = affiliateLink,
                preferences = preferences,
                action = action,
                previousMessage = previousMessage
            )
        )
    }

    suspend fun runPipeline(
        url: String,
        customAffiliate: String? = null,
        preferences: OfferPreferences? = null
    ): Result<PipelineOfferResponse> = runCatching {
        api.runPipeline(
            PipelineOfferRequest(
                url = url,
                customAffiliate = customAffiliate,
                preferences = preferences,
                saveToHistory = true
            )
        )
    }

    suspend fun getHistory(range: String? = null, favoritesOnly: Boolean? = null, search: String? = null): Result<List<HistoryItem>> = runCatching {
        api.getHistory(range, favoritesOnly, search).items
    }

    suspend fun saveHistory(item: HistoryItem): Result<HistoryItem?> = runCatching {
        api.saveHistory(item)["item"]
    }

    suspend fun toggleFavorite(id: String): Result<Boolean> = runCatching {
        api.toggleFavorite(id).isFavorite
    }

    suspend fun deleteHistory(id: String): Result<Boolean> = runCatching {
        api.deleteHistory(id)["success"] ?: false
    }

    suspend fun getSettings(): Result<SettingsResponse> = runCatching {
        api.getSettings()
    }

    suspend fun updateSettings(settings: AppSettings): Result<SettingsResponse> = runCatching {
        api.updateSettings(settings)
    }
}
