# VSTS Helm Extension

This repo contains the sourcecode to a very simple [build task exension](https://www.visualstudio.com/en-us/docs/integrate/extensions/develop/add-build-task) for installing and running the popular [Helm](https://github.com/kubernetes/helm) package manager within Visual Studio Team Services builds. The extension I've written is inspired and borows from the patterns used by the [Kubernetes extension](https://github.com/Microsoft/vsts-tasks/tree/master/Tasks/Kubernetes).

# Project Status
This extension is a work in progress. It is not yet ready for use in production environments. Use this task at your own risk as the interface and configuration options are subject to change. If you'd like to use Helm commands in production VSTS release definitions, please use the bash task on a custom VSTS build agent equipped with Helm. Bug fixes and PR's are welcome. 

# Usage
See [Overview](./overview.md#Usage)


# Development
To run the extension locally for testing:
* run `npm install` in the Helm directory
* run `tsc` in the Helm directory
* Modify [launch.json](./.vscode/launch.json) for your needs. You can simulate inputs for the task. One input you'll need to provide is the "ENDPOINT_AUTH_PARAMETER_*_kubeconfig". This should be a kubectl config file converted to json. For my testing purposes I have a run a minikube local cluster for testing.