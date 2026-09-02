package com.ofertaexpress.app.data.api

import com.ofertaexpress.app.data.models.*
import retrofit2.http.*

interface OfertaExpressApiService {

    @GET("api/health")
    suspend fun healthCheck(): HealthCheckResponse

    @POST("api/product/resolve")
    suspend fun resolveProduct(@Body request: ResolveProductRequest): ResolveProductResponse

    @POST("api/affiliate/convert")
    suspend fun convertAffiliate(@Body request: ConvertAffiliateRequest): ConvertAffiliateResponse

    @POST("api/offer/generate")
    suspend fun generateOffer(@Body request: GenerateOfferRequest): GeneratedOffer

    @POST("api/offer/pipeline")
    suspend fun runPipeline(@Body request: PipelineOfferRequest): PipelineOfferResponse

    @GET("api/history")
    suspend fun getHistory(
        @Query("range") range: String? = null,
        @Query("favoritesOnly") favoritesOnly: Boolean? = null,
        @Query("search") search: String? = null
    ): HistoryListResponse

    @POST("api/history")
    suspend fun saveHistory(@Body item: HistoryItem): Map<String, HistoryItem>

    @POST("api/history/{id}/favorite")
    suspend fun toggleFavorite(@Path("id") id: String): FavoriteToggleResponse

    @DELETE("api/history/{id}")
    suspend fun deleteHistory(@Path("id") id: String): Map<String, Boolean>

    @GET("api/settings")
    suspend fun getSettings(): SettingsResponse

    @POST("api/settings")
    suspend fun updateSettings(@Body settings: AppSettings): SettingsResponse
}
