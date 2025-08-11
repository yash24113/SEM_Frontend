module.exports = {
    webpack: {
        configure: {
            resolve: {
                fallback: {
                    "fs": false,
                    "url": require.resolve("url/"),
                    "http": require.resolve("stream-http"),
                    "https": require.resolve("https-browserify"),
                    "child_process": false
                }
            }
        }
    }
};
