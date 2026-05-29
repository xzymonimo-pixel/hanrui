import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/index.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  return(
    <>
      <Head>
        <title>瑞的小屋</title>
        <meta property="og:image" content="https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/og-image.png" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
