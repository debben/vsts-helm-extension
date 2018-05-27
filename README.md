# DEPRECATION WARNING
This extension is no longer actively maintained. There is now an official Helm extension available for VSTS in the [vsts-tasks](https://github.com/microsoft/vsts-tasks) repo. Please use this extension as the one contained in this repository will no longer recieve features or bug fixes.

# VSTS Helm Extension

This repo contains the sourcecode to a very simple [build task exension](https://www.visualstudio.com/en-us/docs/integrate/extensions/develop/add-build-task) for installing and running the popular [Helm](https://github.com/kubernetes/helm) package manager within Visual Studio Team Services builds. The extension I've written is inspired and borows from the patterns used by the [Kubernetes extension](https://github.com/Microsoft/vsts-tasks/tree/master/Tasks/Kubernetes).


# Usage
See [Overview](./overview.md#Usage)


# Development
To run the extension locally for testing:
* run `npm install` in the Helm directory
* run `tsc` in the Helm directory
* Modify [launch.json](./.vscode/launch.json) for your needs. You can simulate inputs for the task. On you'll need to provide is the "ENDPOINT_AUTH_PARAMETER_*_kubeconfig". This should be a kubectl config file converted to json. For my testing purposes I have a run a minikube local cluster for testing.