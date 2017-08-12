# VSTS Helm Extension

The unofficial extension for Helm!

This is a very simple [build task exension](https://www.visualstudio.com/en-us/docs/integrate/extensions/develop/add-build-task) for installing and running the popular [Helm](https://github.com/kubernetes/helm) package manager within Visual Studio Team Services builds.

# Usage

To use, specify the version of helm you'd like to use. The version can be a semver range and the extension will either find that version in the tools cache or download the latest matching version.

Simply select the Helm command you'd like to run and provide the appropriate arguments.

## HELM_HOME
The build tasks does pass along the HELM_HOME environment variable. If you have a directory structure for Helm home stored elsewhere, you can download that information and provide the path in the environment variable.