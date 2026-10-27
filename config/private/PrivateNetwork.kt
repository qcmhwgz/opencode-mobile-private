package app.opencode.mobile.privateedition

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import java.net.InetAddress
import java.net.Proxy
import java.net.Socket
import javax.net.SocketFactory

// HTTP, XHR and PTY WebSocket upgrades through RN share this policy.
object PrivateNetwork {
  private fun activeVpn(context: Context): Network {
    val connectivity = context.getSystemService(ConnectivityManager::class.java)
    val network = connectivity.activeNetwork
    if (network == null || connectivity.getNetworkCapabilities(network)
        ?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) != true) {
      throw IOException("Private Edition requires an active VPN for server traffic")
    }
    return network
  }

  // Binding prevents an already-created socket from falling back to another
  // network if WireGuard disconnects between the guard and TCP connection.
  private class VpnSockets(private val context: Context) : SocketFactory() {
    private fun delegate(): SocketFactory = activeVpn(context).socketFactory
    override fun createSocket(): Socket = delegate().createSocket()
    override fun createSocket(host: String, port: Int): Socket = delegate().createSocket(host, port)
    override fun createSocket(host: String, port: Int, local: InetAddress, localPort: Int): Socket = delegate().createSocket(host, port, local, localPort)
    override fun createSocket(host: InetAddress, port: Int): Socket = delegate().createSocket(host, port)
    override fun createSocket(host: InetAddress, port: Int, local: InetAddress, localPort: Int): Socket = delegate().createSocket(host, port, local, localPort)
  }

  class Guard(private val context: Context) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
      activeVpn(context)
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
        .proxy(Proxy.NO_PROXY).socketFactory(VpnSockets(context))
        .followRedirects(false).followSslRedirects(false)
        .addInterceptor(Guard(context)).addNetworkInterceptor(Guard(context)).build()
    }
  }
}
