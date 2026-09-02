package com.ofertaexpress.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ofertaexpress.app.ui.theme.*

enum class PipelineStep(val stepNumber: Int, val title: String, val desc: String) {
    RESOLVING(1, "Buscando dados", "Extraindo informações da Shopee"),
    AFFILIATE(2, "Link de Afiliado", "Garantindo comissão e rastreio"),
    GENERATING(3, "Redação com IA", "Criando mensagem de alta conversão")
}

@Composable
fun StepProgressIndicator(
    currentStep: PipelineStep
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(BrandCardBg)
            .border(1.dp, BrandCardBorder, RoundedCornerShape(24.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            PipelineStep.values().forEach { step ->
                val isActive = step == currentStep
                val isCompleted = step.stepNumber < currentStep.stepNumber

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(26.dp)
                            .clip(CircleShape)
                            .background(
                                when {
                                    isCompleted -> BrandGreen
                                    isActive -> BrandOrange.copy(alpha = alpha)
                                    else -> BrandCardSubBg
                                }
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (isCompleted) "✓" else "${step.stepNumber}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextWhite
                        )
                    }

                    Text(
                        text = step.title,
                        fontSize = 11.sp,
                        fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                        color = if (isActive) BrandOrangeLight else if (isCompleted) BrandGreen else TextMuted
                    )
                }
            }
        }

        Text(
            text = currentStep.desc,
            fontSize = 11.sp,
            color = TextSubtle
        )
    }
}
