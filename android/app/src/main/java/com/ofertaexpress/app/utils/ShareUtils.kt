package com.ofertaexpress.app.utils

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream

object ShareUtils {

    fun copyToClipboard(context: Context, text: String, label: String = "Oferta") {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText(label, text)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "✅ Oferta copiada com sucesso!", Toast.LENGTH_SHORT).show()
    }

    suspend fun shareOfferWithImage(
        context: Context,
        okHttpClient: OkHttpClient,
        imageUrl: String?,
        messageText: String
    ) {
        withContext(Dispatchers.IO) {
            try {
                var imageUri: Uri? = null

                if (!imageUrl.isNullOrBlank()) {
                    val request = Request.Builder().url(imageUrl).build()
                    val response = okHttpClient.newCall(request).execute()

                    if (response.isSuccessful) {
                        val imagesDir = File(context.cacheDir, "images")
                        if (!imagesDir.exists()) imagesDir.mkdirs()

                        val imageFile = File(imagesDir, "oferta_share_${System.currentTimeMillis()}.jpg")
                        response.body?.byteStream()?.use { input ->
                            FileOutputStream(imageFile).use { output ->
                                input.copyTo(output)
                            }
                        }

                        imageUri = FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            imageFile
                        )
                    }
                }

                withContext(Dispatchers.Main) {
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        if (imageUri != null) {
                            type = "image/jpeg"
                            putExtra(Intent.EXTRA_STREAM, imageUri)
                            putExtra(Intent.EXTRA_TEXT, messageText)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        } else {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, messageText)
                        }
                    }
                    context.startActivity(Intent.createChooser(intent, "Compartilhar Oferta no WhatsApp"))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    // Fallback to text only
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, messageText)
                    }
                    context.startActivity(Intent.createChooser(intent, "Compartilhar Oferta"))
                }
            }
        }
    }
}
