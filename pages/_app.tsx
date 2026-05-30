import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/index.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script dangerouslySetInnerHTML={{__html: `
          var _hmt = _hmt || [];
          (function() {
            var hm = document.createElement("script");
            hm.src = "https://hm.baidu.com/hm.js?07f5bad57be3545dd5103c277fa43a63";
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(hm, s);
          })();
        `}}/>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
