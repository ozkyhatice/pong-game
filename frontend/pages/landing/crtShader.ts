(window as any).crtFragmentShader = `
#ifdef GL_ES
    precision highp float;
#endif

#define MATH_PI 3.14159265359

varying vec2 vUV;
uniform sampler2D textureSampler;

uniform vec2 displayResolution;

#define BRIGHTNESS 1.2
#define CURVATURE_X 2.5
#define CURVATURE_Y 2.5
#define VIGNETTE_OPACITY 1.0
#define VIGNETTE_ROUNDNESS 1.5
#define SCANLINE_OPACITY_X 1.0
#define SCANLINE_OPACITY_Y 1.0

vec2 applyScreenDistortion(vec2 texCoord) {
    vec2 centeredCoord = texCoord * 2.0 - 1.0;

    vec2 distortionFactor = abs(centeredCoord.yx) / vec2(CURVATURE_X, CURVATURE_Y);

    vec2 warpedCoord = centeredCoord + centeredCoord * distortionFactor * distortionFactor;

    return warpedCoord * 0.5 + 0.5;
}

vec4 calculateScanlines(float coordinate, float resolution, float strength) {
    float scanlinePattern = sin(coordinate * resolution * MATH_PI * 2.0);

    float normalizedPattern = (scanlinePattern * 0.5 + 0.5) * 0.9 + 0.1;

    float finalIntensity = pow(normalizedPattern, strength);

    return vec4(finalIntensity, finalIntensity, finalIntensity, 1.0);
}

vec4 applyVignetting(vec2 texCoord, vec2 resolution, float intensity, float roundness) {
    float edgeFalloff = texCoord.x * texCoord.y * (1.0 - texCoord.x) * (1.0 - texCoord.y);

    float scaledFalloff = (resolution.x / roundness) * edgeFalloff;

    float vignetteValue = clamp(pow(scaledFalloff, intensity), 0.0, 1.0);

    return vec4(vignetteValue, vignetteValue, vignetteValue, 1.0);
}

void main(void) {
    vec2 distortedUV = applyScreenDistortion(vUV);

    vec4 originalColor = texture2D(textureSampler, distortedUV);

    vec4 vignetteEffect = applyVignetting(distortedUV, displayResolution, VIGNETTE_OPACITY, VIGNETTE_ROUNDNESS);
    originalColor *= vignetteEffect;

    vec4 horizontalScanlines = calculateScanlines(distortedUV.x, displayResolution.y, SCANLINE_OPACITY_X);
    vec4 verticalScanlines = calculateScanlines(distortedUV.y, displayResolution.x, SCANLINE_OPACITY_Y);

    originalColor *= horizontalScanlines;
    originalColor *= verticalScanlines;

    originalColor *= vec4(BRIGHTNESS, BRIGHTNESS, BRIGHTNESS, 1.0);

    if (distortedUV.x < 0.0 || distortedUV.y < 0.0 || distortedUV.x > 1.0 || distortedUV.y > 1.0)
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    else
        gl_FragColor = originalColor;
}
`;
