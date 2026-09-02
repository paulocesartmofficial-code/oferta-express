package com.ofertaexpress.app.utils

import java.net.URI

data class ValidationResult(
    val isValid: Boolean,
    val cleanUrl: String? = null,
    val isShortLink: Boolean = false,
    val isAffiliateLink: Boolean = false,
    val errorMessage: String? = null
)

object UrlValidator {

    private val ALLOWED_HOST_SUFFIXES = listOf(
        "shopee.com.br",
        "shopee.com",
        "s.shopee.com.br",
        "shope.ee",
        "shp.ee"
    )

    fun validateShopeeUrl(rawUrl: String): ValidationResult {
        val trimmed = rawUrl.trim()
        if (trimmed.isEmpty()) {
            return ValidationResult(isValid = false, errorMessage = "Cole um link da Shopee para começar.")
        }

        val urlToParse = if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            "https://$trimmed"
        } else {
            trimmed
        }

        return try {
            val uri = URI(urlToParse)
            val host = uri.host?.lowercase() ?: ""

            val isAllowed = ALLOWED_HOST_SUFFIXES.any { suffix ->
                host == suffix || host.endsWith(".$suffix")
            }

            if (!isAllowed) {
                return ValidationResult(
                    isValid = false,
                    errorMessage = "Este aplicativo aceita apenas links da Shopee (shopee.com.br, s.shopee.com.br, shope.ee)."
                )
            }

            val isShortLink = host.startsWith("s.shopee") || host == "shope.ee" || host == "shp.ee"
            val isAffiliateLink = isShortLink || uri.query?.contains("affiliate") == true || uri.query?.contains("sub_id") == true

            ValidationResult(
                isValid = true,
                cleanUrl = urlToParse,
                isShortLink = isShortLink,
                isAffiliateLink = isAffiliateLink
            )
        } catch (e: Exception) {
            ValidationResult(
                isValid = false,
                errorMessage = "Formato de URL inválido."
            )
        }
    }
}
