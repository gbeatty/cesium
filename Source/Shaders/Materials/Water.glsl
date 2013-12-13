// based off GPU Gems, Chapter 1. Effective Water Simulation from Physical Models

uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform sampler2D foamTexture;
uniform vec4 baseWaterColor;
uniform vec4 blendColor;
uniform float frequency;
uniform float animationSpeed;
uniform float amplitude;
uniform float waveSteepness;
uniform vec2 waveDirection;
uniform float surfaceRoughness;
uniform float specularIntensity;
uniform float fadeFactor;

const int numberOfWaves = 4;

float sinAngle1 = sin(8.0 / czm_degreesPerRadian);
float cosAngle1 = cos(8.0 / czm_degreesPerRadian);
float sinAngle2 = sin(-5.0 / czm_degreesPerRadian);
float cosAngle2 = cos(-5.0 / czm_degreesPerRadian);
float sinAngle3 = sin(0.0 / czm_degreesPerRadian);
float cosAngle3= cos(0.0 / czm_degreesPerRadian);

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    float time = czm_frameNumber;
    
    // clamp wave steepness to reasonable values
    float steepness = clamp(waveSteepness, 0.0, 10.0);
    
    vec2 waveDirections[4];
    waveDirections[0]  = -waveDirection;
    waveDirections[1] = vec2((cosAngle1 * waveDirections[0].x) - (sinAngle1 * waveDirections[0].y), (sinAngle1 * waveDirections[0].x) + (cosAngle1 * waveDirections[0].y));
    waveDirections[2] = vec2((cosAngle2 * waveDirections[0].x) - (sinAngle2 * waveDirections[0].y), (sinAngle2 * waveDirections[0].x) + (cosAngle2 * waveDirections[0].y));
    waveDirections[3] = vec2((cosAngle3 * waveDirections[0].x) - (sinAngle3 * waveDirections[0].y), (sinAngle3 * waveDirections[0].x) + (cosAngle3 * waveDirections[0].y));
    
    float frequencies[4];
    frequencies[0] = frequency;
    frequencies[1] = frequency / 1.8;
    frequencies[2] = frequency / 1.6;
    frequencies[3] = frequency / 2.0;
    
    float amplitudes[4];
    amplitudes[0] = amplitude / frequency;
    amplitudes[1] = amplitudes[0] * 1.5;
    amplitudes[2] = amplitudes[0] * 1.3;
    amplitudes[3] = amplitudes[0] * 2.0;
    
    float speed[4];
    speed[0] = animationSpeed * frequency;
    speed[1] = speed[0] / 1.8;
    speed[2] = speed[0] / 1.5;
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
        //waveHeight += sin(dot(d, uv) * w + time * waveSpeed);
        
        //partialDerrivativeX += w * d.x * a * cos(dot(d, uv) * w + time * waveSpeed);
        //partialDerrivativeY += w * d.y * a * cos(dot(d, uv) * w + time * waveSpeed);
        
        float temp = dot(d, uv) * w + time * waveSpeed;
        float exp = 1.0 + steepness;
        partialDerrivativeX += exp * w * d.x * a * cos(temp) * pow((sin(temp) + 1.0) / 2.0, exp-1.0);
        partialDerrivativeY += exp * w * d.y * a * cos(temp) * pow((sin(temp) + 1.0) / 2.0, exp-1.0);
       }
    
    
    
    vec3 normalTangentSpace = normalize(vec3(-partialDerrivativeX, -partialDerrivativeY, 1.0));
    
    // wave crest foam
    //vec3 direction = normalize(vec3(waveDirections[0], 0.0));
    //float scalarProduct = dot(direction, normalTangentSpace);
    //float foamFactor = 0.0;
   // if(scalarProduct > 0.0) {
   //     foamFactor = (waveHeight / 2.0 + 0.5);
   // }
    //vec3 foamColor = texture2D(foamTexture, fract(materialInput.st * frequency + time)).rgb;
    
    
    // fade is a function of the distance from the fragment and the frequency of the waves
   // float fade = max(1.0, (length(materialInput.positionToEyeEC) / 10000000000.0) * frequency * fadeFactor);
            
    float specularMapValue = texture2D(specularMap, materialInput.st).r;
    
    // get water surface noise
    vec4 noise = czm_getWaterNoise(normalMap, materialInput.st * frequency * 40.0, time / 50.0) * surfaceRoughness ;
    normalTangentSpace.xy += noise.xy;
    
    // fade out the normal perturbation as we move further from the water surface
    //normalTangentSpace.xy /= fade;*/
        
    // attempt to fade out the normal perturbation as we approach non water areas (low specular map value)
   //normalTangentSpace = mix(vec3(0.0, 0.0, 50.0), normalTangentSpace, specularMapValue);
    
    normalTangentSpace = normalize(normalTangentSpace);
    
    // get ratios for alignment of the new normal vector with a vector perpendicular to the tangent plane
    float tsPerturbationRatio = clamp(dot(normalTangentSpace, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    
    // fade out water effect as specular map value decreases
    material.alpha = specularMapValue;
    
    // base color is a blend of the water and non-water color based on the value from the specular map
    // may need a uniform blend factor to better control this
    material.diffuse = mix(blendColor.rgb, baseWaterColor.rgb, specularMapValue);
    
    // diffuse highlights are based on how perturbed the normal is
    material.diffuse += (0.1 * tsPerturbationRatio);
    
    material.normal = normalize(materialInput.tangentToEyeMatrix * normalTangentSpace);
    
    material.specular = specularIntensity;
    material.shininess = 10.0;
    
    return material;
}