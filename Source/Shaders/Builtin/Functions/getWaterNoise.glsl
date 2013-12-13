/**
 * @private
 */
 
// time dependent sampling directions
const vec2 s0 = vec2(1.0/17.0, 0.0);
const vec2 s1 = vec2(-1.0/29.0, 0.0);
const vec2 s2 = vec2(1.0/101.0, 1.0/59.0);
const vec2 s3 = vec2(-1.0/109.0, -1.0/57.0);
 
vec4 czm_getWaterNoise(sampler2D normalMap, vec2 uv, float time)
{
    vec2 uv0 = (uv/103.0) + (time * s0);
    vec2 uv1 = uv/107.0 + (time * s1) + vec2(0.23);
    vec2 uv2 = uv/vec2(897.0, 983.0) + (time * s2) + vec2(0.51);
    vec2 uv3 = uv/vec2(991.0, 877.0) + (time * s3) + vec2(0.71);

    uv0 = fract(uv0);
    uv1 = fract(uv1);
    uv2 = fract(uv2);
    uv3 = fract(uv3);
    vec4 noise = (texture2D(normalMap, uv0)) +
                 (texture2D(normalMap, uv1)) +
                 (texture2D(normalMap, uv2)) +
                 (texture2D(normalMap, uv3));

    // average and scale to between -1 and 1
    return ((noise / 4.0) - 0.5) * 2.0;
}
