package app.opencode.mobile.privateedition

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

// HTTP, XHR and PTY WebSocket upgrades through RN share this policy.
object PrivateNetwork {
  class Guard(private val context: Context) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
      val connectivity = context.getSystemService(ConnectivityManager::class.java)
      val network = connectivity.activeNetwork
      if (network == null || connectivity.getNetworkCapabilities(network)
          ?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) != true) {
        throw IOException("Private Edition requires an active VPN for server traffic")
      }
      val url = chain.request().url
      if (url.scheme != "http" || url.host != "10.0.0.2" || url.port != 47119 ||
          url.username.isNotEmpty() || url.password.isNotEmpty()) {
        throw IOException("Private Edition destination denied")
      }
      return chain.proceed(chain.request())
    }
  }
  fun install(context: Context) {
    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder()
        .followRedirects(false).followSslRedirects(false)
        .addInterceptor(Guard(context)).addNetworkInterceptor(Guard(context)).build()
    }
  }
}
