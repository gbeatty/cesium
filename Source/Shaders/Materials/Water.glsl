// based off GPU Gems, Chapter 1. Effective Water Simulation from Physical Models

uniform sampler2D waterSpecularMap;
uniform sampler2D waterNormalMap;
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

const int numberOfWaves = 7;

float sinAngle1 = sin(15.0 / czm_degreesPerRadian);
float cosAngle1 = cos(15.0 / czm_degreesPerRadian);
float sinAngle2 = sin(-15.0 / czm_degreesPerRadian);
float cosAngle2 = cos(-15.0 / czm_degreesPerRadian);
float sinAngle3 = sin(0.0 / czm_degreesPerRadian);
float cosAngle3= cos(0.0 / czm_degreesPerRadian);
float sinAngle4 = sin(5.5 / czm_degreesPerRadian);
float cosAngle4= cos(5.5 / czm_degreesPerRadian);
float sinAngle5 = sin(-6.5 / czm_degreesPerRadian);
float cosAngle5= cos(-6.5 / czm_degreesPerRadian);
float sinAngle6 = sin(3.0 / czm_degreesPerRadian);
float cosAngle6= cos(3.0 / czm_degreesPerRadian);

vec2 waveDirections[7];
float frequencies[7];
float amplitudes[7];
float speed[7];
float cycleTimes[7];
float waveTime = czm_frameNumber;

float ComputeWaveCycleFactor(float waveCycle, float minValue, float maxValue)
{
	float halfWaveCycle = waveCycle / 2.0;
	float deltaFromMidCycle = abs(mod(waveTime, waveCycle) - halfWaveCycle);
	
	float zeroToOneFactor = deltaFromMidCycle / halfWaveCycle;
	float delta = maxValue - minValue;
	float scaledFactor = (zeroToOneFactor * delta) + minValue;
	
	return scaledFactor;
}

void ComputeWaveParameters()
{
	waveDirections[0]  = -waveDirection;
    waveDirections[1] = vec2((cosAngle1 * waveDirections[0].x) - (sinAngle1 * waveDirections[0].y), (sinAngle1 * waveDirections[0].x) + (cosAngle1 * waveDirections[0].y));
    waveDirections[2] = vec2((cosAngle2 * waveDirections[0].x) - (sinAngle2 * waveDirections[0].y), (sinAngle2 * waveDirections[0].x) + (cosAngle2 * waveDirections[0].y));
    waveDirections[3] = vec2((cosAngle3 * waveDirections[0].x) - (sinAngle3 * waveDirections[0].y), (sinAngle3 * waveDirections[0].x) + (cosAngle3 * waveDirections[0].y));
    waveDirections[4] = vec2((cosAngle4 * waveDirections[0].x) - (sinAngle4 * waveDirections[0].y), (sinAngle4 * waveDirections[0].x) + (cosAngle4 * waveDirections[0].y));
    waveDirections[5] = vec2((cosAngle5 * waveDirections[0].x) - (sinAngle5 * waveDirections[0].y), (sinAngle5 * waveDirections[0].x) + (cosAngle5 * waveDirections[0].y));
    waveDirections[6] = vec2((cosAngle6 * waveDirections[0].x) - (sinAngle6 * waveDirections[0].y), (sinAngle6 * waveDirections[0].x) + (cosAngle6 * waveDirections[0].y));
    
    frequencies[0] = waveFrequency * 0.3;
    frequencies[1] = waveFrequency * 1.0;
    frequencies[2] = waveFrequency * 1.0;
    frequencies[3] = waveFrequency * 0.5;
    frequencies[4] = waveFrequency * 1.5;
    frequencies[5] = waveFrequency * 1.7;
    frequencies[6] = waveFrequency * 1.5;
    
    cycleTimes[0] = 420.0;
    cycleTimes[1] = 400.0;
    cycleTimes[2] = 200.0;
    cycleTimes[3] = 500.0;
    cycleTimes[4] = 510.0;
    cycleTimes[5] = 200.0;
    cycleTimes[6] = 210.0;
    
    float baseAmplitude = waveAmplitude / waveFrequency;
    amplitudes[0] = baseAmplitude * 1.0 * ComputeWaveCycleFactor(cycleTimes[0], 0.7, 1.0);
    amplitudes[1] = baseAmplitude * 0.2 * ComputeWaveCycleFactor(cycleTimes[1], 0.7, 1.0);
    amplitudes[2] = baseAmplitude * 0.2 * ComputeWaveCycleFactor(cycleTimes[2], 0.7, 1.0);
    amplitudes[3] = baseAmplitude * 2.0 * ComputeWaveCycleFactor(cycleTimes[3], 0.3, 1.0);
    amplitudes[4] = baseAmplitude * 0.4 * ComputeWaveCycleFactor(cycleTimes[4], 0.3, 1.0);
    amplitudes[5] = baseAmplitude * 0.2 * ComputeWaveCycleFactor(cycleTimes[5], 0.3, 1.0);
    amplitudes[6] = baseAmplitude * 0.2 * ComputeWaveCycleFactor(cycleTimes[6], 0.3, 1.0);
    
    speed[0] = waterAnimationSpeed * waveFrequency;
    speed[1] = speed[0] / 1.8;
    speed[2] = speed[0] / 1.5;
    speed[3] = speed[0] / 2.0;
    speed[4] = speed[0] / 2.2;
    speed[5] = speed[0] / 2.0;
    speed[6] = speed[0] / 0.5;
}

float ComputeWaveHeight(vec2 st, bool waveParamsComputed)
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

vec3 ComputeWaterSurfaceTangent(vec2 st, vec3 positionToEyeEC, float specularValue, bool waveParamsComputed)
{
	if(!waveParamsComputed)
	{
		ComputeWaveParameters();
	}
	
	// clamp wave steepness to reasonable values
    float steepness = clamp(waveSteepness, 0.0, 10.0);

	float partialDerrivativeX = 0.0;
    float partialDerrivativeY = 0.0;
    
    vec2 normalUV;
    
    for(int waveNumber = 0; waveNumber < numberOfWaves; ++waveNumber) {
        vec2 d = waveDirections[waveNumber];
        float w = frequencies[waveNumber];
        float a = amplitudes[waveNumber];
        float waveSpeed = speed[waveNumber];
           
        float temp = dot(d, st) * w + waveTime * waveSpeed;
        float exp = 1.0 + steepness;
        partialDerrivativeX += exp * w * d.x * a * cos(temp) * pow((sin(temp) + 1.0) / 2.0, exp-1.0);
        partialDerrivativeY += exp * w * d.y * a * cos(temp) * pow((sin(temp) + 1.0) / 2.0, exp-1.0);
       }
    
    
    
    vec3 normalTangentSpace = normalize(vec3(-partialDerrivativeX, -partialDerrivativeY, 1.0));
    
    // get water surface noise
    vec4 noise = czm_getWaterNoise(waterNormalMap, st * waveFrequency * 40.0, waveTime / 50.0) * waterSurfaceRoughness ;
    normalTangentSpace.xy += noise.xy;
    
    // fade out the normal perturbation as we move further from the water surface
    // fade is a function of the distance from the fragment and the frequency of the waves
    float fade = max(1.0, (length(positionToEyeEC) / 10000000000.0) * waveFrequency * waterFadeFactor);
    normalTangentSpace.xy /= fade;
        
    // fade out the normal perturbation as we approach non water areas (low specular map value)
    normalTangentSpace = mix(vec3(0.0, 0.0, 50.0), normalTangentSpace, specularValue);
    
    normalTangentSpace = normalize(normalTangentSpace);
    
    return normalTangentSpace;
}

czm_material GenerateWaterMaterial(czm_materialInput materialInput, bool useSpecularValue, float specularValue)
{
	czm_material material = czm_getDefaultMaterial(materialInput);
    
    ComputeWaveParameters();   
    
    float specularMapValue = useSpecularValue ? specularValue : texture2D(waterSpecularMap, materialInput.st).r;
    
    // wave height not needed right now. Left this here in case we decide to do mesh vertex offsets in the future for real waves.
    //float waveHeight = ComputeWaveHeight(materialInput.st, true);
    
    vec3 normalTangentSpace = ComputeWaterSurfaceTangent(materialInput.st, materialInput.positionToEyeEC, specularMapValue, true);  
    
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

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    return GenerateWaterMaterial(materialInput, false, 0.0);
}