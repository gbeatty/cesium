// Thanks for the contribution Jonas
// http://29a.ch/2012/7/19/webgl-terrain-rendering-water-fog

uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform sampler2D foamTexture;
uniform vec4 baseWaterColor;
uniform vec4 blendColor;
uniform float frequency;
uniform float animationSpeed;
uniform float amplitude;
uniform float specularIntensity;
uniform float fadeFactor;

const int numberOfWaves = 4;

float sinAngle1 = sin(45.0 / czm_degreesPerRadian);
float cosAngle1 = cos(45.0 / czm_degreesPerRadian);
float sinAngle2 = sin(-45.0 / czm_degreesPerRadian);
float cosAngle2 = cos(-45.0 / czm_degreesPerRadian);
float sinAngle3 = sin(0.0 / czm_degreesPerRadian);
float cosAngle3= cos(0.0 / czm_degreesPerRadian);

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    float time = czm_frameNumber;
    
    // not using directional motion yet. This will eventually become a uniform
    const vec2 waveDirection = vec2(1.0, 0.0);
    
    
    
    vec2 waveDirections[4];
    waveDirections[0]  = waveDirection;
    waveDirections[1] = vec2((cosAngle1 * waveDirection.x) - (sinAngle1 * waveDirection.y), (sinAngle1 * waveDirection.x) + (cosAngle1 * waveDirection.y));
    waveDirections[2] = vec2((cosAngle2 * waveDirection.x) - (sinAngle2 * waveDirection.y), (sinAngle2 * waveDirection.x) + (cosAngle2 * waveDirection.y));
    waveDirections[3] = vec2((cosAngle3 * waveDirection.x) - (sinAngle3 * waveDirection.y), (sinAngle3 * waveDirection.x) + (cosAngle3 * waveDirection.y));
    
    float frequencies[4];
    frequencies[0] = frequency;
    frequencies[1] = frequency / 5.0;
    frequencies[2] = frequency / 5.0;
    frequencies[3] = frequency / 2.0;
    
    float amplitudes[4];
    amplitudes[0] = amplitude;
    amplitudes[1] = amplitude;
    amplitudes[2] = amplitude;
    amplitudes[3] = amplitude;
    
    float speed[4];
    speed[0] = animationSpeed * frequency;
    speed[1] = speed[0] / 2.0;
    speed[2] = speed[0] / 2.0;
    speed[3] = speed[0] / 2.0;
    
    
    
    float waveHeight = 0.0;
    float partialDerrivativeX = 0.0;
    float partialDerrivativeY = 0.0;
    
    vec2 normalUV;
    
    for(int waveNumber = 0; waveNumber < numberOfWaves; ++waveNumber) {
        vec2 d = waveDirections[waveNumber];
        float w = frequencies[waveNumber];
        float a = amplitudes[waveNumber];
        float waveSpeed = speed[waveNumber];
        vec2 uv = materialInput.st;
    
        // wave height not needed right now. Left this here in case we decide to do mesh vertex offsets in the future for real waves.
        //waveHeight += amplitude * sin(dot(waveDirections[waveNumber], materialInput.st) * frequencies[waveNumber] + time * waveSpeed);
        
        //partialDerrivativeX += w * d.x * a * cos(dot(d, uv) * w + time * waveSpeed);
        //partialDerrivativeY += w * d.y * a * cos(dot(d, uv) * w + time * waveSpeed);
        
        float temp = dot(d, uv) * w + time * waveSpeed;
        float exp = 1.2;
        partialDerrivativeX += exp * w * d.x * a * cos(temp) * pow((sin(temp) + 1.0) / 2.0, exp-1.0);
        partialDerrivativeY += exp * w * d.y * a * cos(temp) * pow((sin(temp) + 1.0) / 2.0, exp-1.0);
       }
    
    
    
    vec3 normalTangentSpace = normalize(vec3(-partialDerrivativeX, -partialDerrivativeY, 1.0));
    
    // wave crest foam
    vec3 direction = normalize(vec3(waveDirections[0], 0.0));
    float foamFactor = -dot(direction, normalTangentSpace);
    foamFactor = clamp(foamFactor, 0.0, 1.0);
    vec3 foamColor = texture2D(foamTexture, fract(materialInput.st * frequency)).rgb;
    
    
    // fade is a function of the distance from the fragment and the frequency of the waves
   // float fade = max(1.0, (length(materialInput.positionToEyeEC) / 10000000000.0) * frequency * fadeFactor);
            
    float specularMapValue = texture2D(specularMap, materialInput.st).r;
    
    // note: not using directional motion at this time, just set the angle to 0.0;
    //vec4 noise = czm_getWaterNoise(normalMap, materialInput.st * frequency * 20.0, time / 50.0, 0.0);
    //normalTangentSpace += normalize(noise.xyz * vec3(1.0, 1.0, 0.8));
    
    // fade out the normal perturbation as we move further from the water surface
    //normalTangentSpace.xy /= fade;*/
        
    // attempt to fade out the normal perturbation as we approach non water areas (low specular map value)
   normalTangentSpace = mix(vec3(0.0, 0.0, 50.0), normalTangentSpace, specularMapValue);
    
    normalTangentSpace = normalize(normalTangentSpace);
    
    // get ratios for alignment of the new normal vector with a vector perpendicular to the tangent plane
    float tsPerturbationRatio = clamp(dot(normalTangentSpace, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    
    // fade out water effect as specular map value decreases
    material.alpha = specularMapValue;
    
    // base color is a blend of the water and non-water color based on the value from the specular map
    // may need a uniform blend factor to better control this
    material.diffuse = mix(blendColor.rgb, baseWaterColor.rgb, specularMapValue);
    material.diffuse = mix(material.diffuse, foamColor, foamFactor);
    
    // diffuse highlights are based on how perturbed the normal is
    material.diffuse += (0.1 * tsPerturbationRatio);
    
    material.normal = normalize(materialInput.tangentToEyeMatrix * normalTangentSpace);
    
    material.specular = specularIntensity;
    material.shininess = 10.0;
    
    return material;
}