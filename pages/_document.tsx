import Document, { Head, Html, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <meta
            name="description"
            content="Explore a photography gallery"
          />
          <meta property="og:site_name" content="photo-gallery-12.vercel.app" />
          <meta
            property="og:description"
            content="Explore a photography gallery"
          />
          <meta property="og:title" content="Luma's gallery" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="a photography gallery" />
          <meta
            name="twitter:description"
            content="Explore a photography gallery"
          />
        </Head>
        <body className="antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
