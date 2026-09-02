package com.ofertaexpress.app

import com.ofertaexpress.app.data.models.ProductData
import com.ofertaexpress.app.utils.UrlValidator
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

class OfertaExpressUnitTest {

    @Test
    fun testValidShopeeStandardUrl() {
        val url = "https://shopee.com.br/product/12345/67890"
        val result = UrlValidator.validateShopeeUrl(url)
        assertTrue(result.isValid)
        assertEquals(url, result.cleanUrl)
        assertFalse(result.isShortLink)
    }

    @Test
    fun testValidShopeeShortUrl() {
        val url = "https://s.shopee.com.br/abc123xyz"
        val result = UrlValidator.validateShopeeUrl(url)
        assertTrue(result.isValid)
        assertTrue(result.isShortLink)
        assertTrue(result.isAffiliateLink)
    }

    @Test
    fun testValidUrlWithoutProtocol() {
        val url = "shopee.com.br/item-exemplo-i.123.456"
        val result = UrlValidator.validateShopeeUrl(url)
        assertTrue(result.isValid)
        assertEquals("https://shopee.com.br/item-exemplo-i.123.456", result.cleanUrl)
    }

    @Test
    fun testInvalidNonShopeeUrl() {
        val url = "https://mercadolivre.com.br/p/MLB123456"
        val result = UrlValidator.validateShopeeUrl(url)
        assertFalse(result.isValid)
        assertNotNull(result.errorMessage)
    }

    @Test
    fun testEmptyUrl() {
        val result = UrlValidator.validateShopeeUrl("   ")
        assertFalse(result.isValid)
    }

    @Test
    fun testProductModelSerialization() {
        val product = ProductData(
            source = "test",
            canonicalUrl = "https://shopee.com.br/test",
            title = "Fone Bluetooth Pro",
            currentPrice = 49.90,
            originalPrice = 99.90,
            discountPercentage = 50,
            couponCode = "PROMO50"
        )

        val json = Json { ignoreUnknownKeys = true }
        val encoded = json.encodeToString(product)
        assertTrue(encoded.contains("Fone Bluetooth Pro"))
        assertTrue(encoded.contains("49.9"))

        val decoded = json.decodeFromString<ProductData>(encoded)
        assertEquals(product.title, decoded.title)
        assertEquals(50, decoded.discountPercentage)
    }
}
