package com.ofertaexpress.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ofertaexpress.app.data.datastore.AppPreferencesDataStore
import com.ofertaexpress.app.data.models.HistoryItem
import com.ofertaexpress.app.data.repository.OfertaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HistoryViewModel(application: Application) : AndroidViewModel(application) {

    private val dataStore = AppPreferencesDataStore(application)
    private var repository = OfertaRepository(AppPreferencesDataStore.DEFAULT_LOCAL_BACKEND)

    private val _items = MutableStateFlow<List<HistoryItem>>(emptyList())
    val items: StateFlow<List<HistoryItem>> = _items.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    init {
        viewModelScope.launch {
            dataStore.backendUrl.collect { url ->
                repository.updateBaseUrl(url)
                loadHistory()
            }
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
        loadHistory(search = query)
    }

    fun loadHistory(search: String? = _searchQuery.value.ifBlank { null }) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getHistory(search = search).fold(
                onSuccess = { list ->
                    _items.value = list
                },
                onFailure = {
                    _items.value = emptyList()
                }
            )
            _isLoading.value = false
        }
    }

    fun toggleFavorite(id: String) {
        viewModelScope.launch {
            repository.toggleFavorite(id).fold(
                onSuccess = { isFav ->
                    _items.value = _items.value.map {
                        if (it.id == id) it.copy(isFavorite = isFav) else it
                    }
                },
                onFailure = {}
            )
        }
    }

    fun deleteItem(id: String) {
        viewModelScope.launch {
            repository.deleteHistory(id).fold(
                onSuccess = {
                    _items.value = _items.value.filter { it.id != id }
                },
                onFailure = {}
            )
        }
    }
}
