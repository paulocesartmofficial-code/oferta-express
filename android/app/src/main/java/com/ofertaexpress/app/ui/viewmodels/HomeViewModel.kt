package com.ofertaexpress.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ofertaexpress.app.data.datastore.AppPreferencesDataStore
import com.ofertaexpress.app.data.models.GeneratedOffer
import com.ofertaexpress.app.data.models.OfferPreferences
import com.ofertaexpress.app.data.models.ProductData
import com.ofertaexpress.app.data.repository.OfertaRepository
import com.ofertaexpress.app.ui.components.PipelineStep
import com.ofertaexpress.app.utils.UrlValidator
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class HomeUiState {
    object Idle : HomeUiState()
    data class Processing(val step: PipelineStep) : HomeUiState()
    data class Success(
        val product: ProductData,
        val offer: GeneratedOffer,
        val isFavorite: Boolean = false,
        val historyId: String? = null
    ) : HomeUiState()
    data class Error(val message: String, val canTryManual: Boolean = false, val failedUrl: String = "") : HomeUiState()
}

class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val dataStore = AppPreferencesDataStore(application)
    private var repository = OfertaRepository(AppPreferencesDataStore.DEFAULT_LOCAL_BACKEND)

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Idle)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _inputUrl = MutableStateFlow("")
    val inputUrl: StateFlow<String> = _inputUrl.asStateFlow()

    private val _customAffiliateUrl = MutableStateFlow("")
    val customAffiliateUrl: StateFlow<String> = _customAffiliateUrl.asStateFlow()

    private val _isOnline = MutableStateFlow(true)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private val _affiliateConfigured = MutableStateFlow(false)
    val affiliateConfigured: StateFlow<Boolean> = _affiliateConfigured.asStateFlow()

    private val _geminiReady = MutableStateFlow(true)
    val geminiReady: StateFlow<Boolean> = _geminiReady.asStateFlow()

    private var currentPreferences = OfferPreferences()

    init {
        viewModelScope.launch {
            dataStore.backendUrl.collect { url ->
                repository.updateBaseUrl(url)
                checkHealth()
            }
        }
        viewModelScope.launch {
            combine(
                dataStore.defaultStyle,
                dataStore.defaultEmojis,
                dataStore.customSignature
            ) { style, emojis, sig ->
                currentPreferences = OfferPreferences(
                    style = style,
                    emojis = emojis,
                    customSignature = sig
                )
            }.collect()
        }
    }

    fun setInputUrl(url: String) {
        _inputUrl.value = url
    }

    fun setCustomAffiliateUrl(url: String) {
        _customAffiliateUrl.value = url
    }

    fun checkHealth() {
        viewModelScope.launch {
            repository.healthCheck().fold(
                onSuccess = { health ->
                    _isOnline.value = true
                    _affiliateConfigured.value = health.affiliateConfigured
                    _geminiReady.value = health.geminiConfigured
                },
                onFailure = {
                    _isOnline.value = false
                }
            )
        }
    }

    fun generateOffer(url: String = _inputUrl.value) {
        val validation = UrlValidator.validateShopeeUrl(url)
        if (!validation.isValid) {
            _uiState.value = HomeUiState.Error(
                message = validation.errorMessage ?: "URL inválida."
            )
            return
        }

        val cleanUrl = validation.cleanUrl ?: url

        viewModelScope.launch {
            _uiState.value = HomeUiState.Processing(PipelineStep.RESOLVING)

            val customAff = _customAffiliateUrl.value.ifBlank { null }
            val pipelineRes = repository.runPipeline(
                url = cleanUrl,
                customAffiliate = customAff,
                preferences = currentPreferences
            )

            pipelineRes.fold(
                onSuccess = { res ->
                    if (res.success && res.product != null && res.offer != null) {
                        _uiState.value = HomeUiState.Success(
                            product = res.product,
                            offer = res.offer,
                            isFavorite = false,
                            historyId = res.historyItem?.id
                        )
                    } else {
                        _uiState.value = HomeUiState.Error(
                            message = res.message ?: "Não foi possível gerar a oferta.",
                            canTryManual = true,
                            failedUrl = cleanUrl
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.value = HomeUiState.Error(
                        message = error.localizedMessage ?: "Erro ao comunicar com o servidor.",
                        canTryManual = true,
                        failedUrl = cleanUrl
                    )
                }
            )
        }
    }

    fun adjustTone(tone: String) {
        val state = _uiState.value as? HomeUiState.Success ?: return

        viewModelScope.launch {
            _uiState.value = HomeUiState.Processing(PipelineStep.GENERATING)

            val customPrefs = currentPreferences.copy(style = tone)
            repository.generateOffer(
                product = state.product,
                affiliateLink = state.offer.affiliateLink,
                preferences = customPrefs,
                action = "regenerate",
                previousMessage = state.offer.formattedText
            ).fold(
                onSuccess = { newOffer ->
                    _uiState.value = state.copy(offer = newOffer)
                },
                onFailure = {
                    _uiState.value = state
                }
            )
        }
    }

    fun toggleFavorite() {
        val state = _uiState.value as? HomeUiState.Success ?: return
        val id = state.historyId ?: return

        viewModelScope.launch {
            repository.toggleFavorite(id).fold(
                onSuccess = { isFav ->
                    _uiState.value = state.copy(isFavorite = isFav)
                },
                onFailure = {}
            )
        }
    }

    fun generateManualOffer(
        title: String,
        currentPrice: Double,
        originalPrice: Double?,
        discount: Int?,
        coupon: String?
    ) {
        val url = _inputUrl.value.ifBlank { "https://shopee.com.br" }
        val manualProduct = ProductData(
            title = title,
            currentPrice = currentPrice,
            originalPrice = originalPrice,
            discountPercentage = discount,
            couponCode = coupon,
            canonicalUrl = url,
            source = "manual"
        )

        viewModelScope.launch {
            _uiState.value = HomeUiState.Processing(PipelineStep.GENERATING)

            repository.generateOffer(
                product = manualProduct,
                affiliateLink = _customAffiliateUrl.value.ifBlank { url },
                preferences = currentPreferences
            ).fold(
                onSuccess = { offer ->
                    _uiState.value = HomeUiState.Success(
                        product = manualProduct,
                        offer = offer
                    )
                },
                onFailure = { error ->
                    _uiState.value = HomeUiState.Error(
                        message = error.localizedMessage ?: "Erro ao gerar oferta manual."
                    )
                }
            )
        }
    }

    fun resetState() {
        _uiState.value = HomeUiState.Idle
    }
}
