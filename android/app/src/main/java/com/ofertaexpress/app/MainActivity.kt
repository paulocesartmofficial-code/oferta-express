package com.ofertaexpress.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.ofertaexpress.app.ui.navigation.AppNavigation
import com.ofertaexpress.app.ui.theme.BrandDarkBg
import com.ofertaexpress.app.ui.theme.OfertaExpressTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val sharedUrl = extractSharedUrl(intent)

        setContent {
            OfertaExpressTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BrandDarkBg
                ) {
                    AppNavigation(sharedUrl = sharedUrl)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val sharedUrl = extractSharedUrl(intent)
        if (!sharedUrl.isNullOrBlank()) {
            setContent {
                OfertaExpressTheme {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = BrandDarkBg
                    ) {
                        AppNavigation(sharedUrl = sharedUrl)
                    }
                }
            }
        }
    }

    private fun extractSharedUrl(intent: Intent?): String? {
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            val text = intent.getStringExtra(Intent.EXTRA_TEXT)
            if (!text.isNullOrBlank()) {
                val match = Regex("""https?://[^\s]+""").find(text)
                return match?.value ?: text.trim()
            }
        }
        return null
    }
}
