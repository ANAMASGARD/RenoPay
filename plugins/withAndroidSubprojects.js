const { withProjectBuildGradle } = require('@expo/config-plugins');

/** Align subproject compileSdk with WDK starter / SDK 54 Android 36 toolchain. */
function withAndroidSubprojects(config) {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      return modConfig;
    }

    const subprojectsBlock = `
subprojects {
  afterEvaluate { project ->
    if (project.hasProperty('android')) {
      project.android {
        compileSdkVersion = 36
      }
    }
  }
}
`;

    if (!modConfig.modResults.contents.includes('subprojects {')) {
      const allProjectsEndIndex = modConfig.modResults.contents.indexOf(
        '}',
        modConfig.modResults.contents.indexOf('allprojects {'),
      );
      if (allProjectsEndIndex !== -1) {
        modConfig.modResults.contents =
          modConfig.modResults.contents.slice(0, allProjectsEndIndex + 1) +
          '\n' +
          subprojectsBlock +
          modConfig.modResults.contents.slice(allProjectsEndIndex + 1);
      }
    }

    return modConfig;
  });
}

module.exports = withAndroidSubprojects;
