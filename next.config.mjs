/** @type {import('next').NextConfig} */
import withPlaiceholder from "@plaiceholder/next";

const config = {
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['res.cloudinary.com','images.ctfassets.net'],
  },
};

export default withPlaiceholder(config);