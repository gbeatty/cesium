// based off GPU Gems, Chapter 1. Effective Water Simulation from Physical Models

uniform sampler2D waterSpecularMap;
uniform sampler2D waterNormalMap;
uniform sampler2D waterFoamTexture;
uniform vec4 waterBaseColor;
uniform vec4 waterBlendColor;
uniform float waterAnimationSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform float waveSteepness;
uniform vec2 waveDirection;
uniform float waterSurfaceRoughness;
uniform float waterSpecularIntensity;
uniform float waterFadeFactor;

const int numberOfWaves = 4;

float sinAngle1 = sin(8.0 / czm_degreesPerRadian);
float cosAngle1 = cos(8.0 / czm_degreesPerRadian);
float sinAngle2 = sin(-5.0 / czm_degreesPerRadian);
float cosAngle2 = cos(-5.0 / czm_degreesPerRadian);
float sinAngle3 = sin(0.0 / czm_degreesPerRadian);
float cosAngle3= cos(0.0 / czm_degreesPerRadian);

vec2 waveDirections[4];
float frequencies[4];
float amplitudes[4];
float speed[4];
float waveTime = czm_frameNumber;

void ComputeWaveParameters()
{
	waveDirections[0]  = -waveDirection;
    waveDirections[1] = vec2((cosAngle1 * waveDirections[0].x) - (sinAngle1 * waveDirections[0].y), (sinAngle1 * waveDirections[0].x) + (cosAngle1 * waveDirections[0].y));
    waveDirections[2] = vec2((cosAngle2 * waveDirections[0].x) - (sinAngle2 * waveDirections[0].y), (sinAngle2 * waveDirections[0].x) + (cosAngle2 * waveDirections[0].y));
    waveDirections[3] = vec2((cosAngle3 * waveDirections[0].x) - (sinAngle3 * waveDirections[0].y), (sinAngle3 * waveDirections[0].x) + (cosAngle3 * waveDirections[0].y));
    
    frequencies[0] = waveFrequency;
    frequencies[1] = waveFrequency / 1.8;
    frequencies[2] = waveFrequency / 1.6;
    frequencies[3] = waveFrequency / 2.0;
    
    amplitudes[0] = waveAmplitude / waveFrequency;
    amplitudes[1] = amplitudes[0] * 1.5;
    amplitudes[2] = amplitudes[0] * 1.3;
    amplitudes[3] = amplitudes[0] * 2.0;
    
    speed[0] = waterAnimationSpeed * waveFrequency;
    speed[1] = speed[0] / 1.8;
    speed[2] = speed[0] / 1.5;
    speed[3] = speed[0] / 2.0;
}

float WaveHeight(vec2 st, bool waveParamsComputed)
{
	if(!waveParamsComputed)
	{
		ComputeWaveParameters();
	}

	float waveHeight = 0.0;
	for(int waveNumber = 0; waveNumber < numberOfWaves; ++waveNumber) {
   
        waveHeight += amplitudes[waveNumber] * sin(dot(waveDirections[waveNumber], st) * frequencies[waveNumber] + waveTime * speed[waveNumber]);
        
     }
     return waveHeight;
}

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    // clamp wave steepness to reasonable values
    float steepness = clamp(waveSteepness, 0.0, 10.0);
    
    ComputeWaveParameters();   
    
    // wave height not needed right now. Left this here in case we decide to do mesh vertex offsets in the future for real waves.
    //float waveHeight = WaveHeight(materialInput.st, true);
    
    float partialDerrivativeX = 0.0;
    float partialDerrivativeY = 0.0;
    
    vec2 normalUV;
    
    for(int waveNumber = 0; waveNumber < numberOfWaves; ++waveNumber) {
        vec2 d = waveDirections[waveNumber];
        float w = frequencies[waveNumber];
        float a = amplitudes[waveNumber];
        float waveSpeed = speed[waveNumber];
        vec2 uv = materialInput.st;
           
        float temp = dot(d, uv) * w + waveTime * waveSpeed;
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
    //vec3 foamColor = texture2D(waterFoamTexture, fract(materialInput.st * waveFrequency + waveTime)).rgb;
    
            
    float specularMapValue = texture2D(waterSpecularMap, materialInput.st).r;
    
    // get water surface noise
    vec4 noise = czm_getWaterNoise(waterNormalMap, materialInput.st * waveFrequency * 40.0, waveTime / 50.0) * waterSurfaceRoughness ;
    normalTangentSpace.xy += noise.xy;
    
    // fade out the normal perturbation as we move further from the water surface
    // fade is a function of the distance from the fragment and the frequency of the waves
    float fade = max(1.0, (length(materialInput.positionToEyeEC) / 10000000000.0) * waveFrequency * waterFadeFactor);
    normalTangentSpace.xy /= fade;
        
    // fade out the normal perturbation as we approach non water areas (low specular map value)
    normalTangentSpace = mix(vec3(0.0, 0.0, 50.0), normalTangentSpace, specularMapValue);
    
    normalTangentSpace = normalize(normalTangentSpace);
    
    // get ratios for alignment of the new normal vector with a vector perpendicular to the tangent plane
    float tsPerturbationRatio = clamp(dot(normalTangentSpace, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    
    // fade out water effect as specular map value decreases
    material.alpha = specularMapValue;
    
    // base color is a blend of the water and non-water color based on the value from the specular map
    // may need a uniform blend factor to better control this
    material.diffuse = mix(waterBlendColor.rgb, waterBaseColor.rgb, specularMapValue);
    
    // diffuse highlights are based on how perturbed the normal is
    material.diffuse += (0.1 * tsPerturbationRatio);
    
    material.normal = normalize(materialInput.tangentToEyeMatrix * normalTangentSpace);
    
    material.specular = waterSpecularIntensity;
    material.shininess = 10.0;
    
    return material;
}