"use strict";

import * as fs from "fs";
import * as path from "path";
import * as tl from "vsts-task-lib/task";
import * as toolLib from 'vsts-task-tool-lib/tool';
import * as restm from 'typed-rest-client/RestClient';
import * as os from "os";

//
// Helm versions interface
// see https://developer.github.com/v3/repos/releases/
//
interface IHelmVersion {
    tag_name: string,
}

let osPlat: string = os.platform();
let osArch: string = os.arch();

export async function getHelm(versionSpec: string, checkLatest: boolean) {
    if (toolLib.isExplicitVersion(versionSpec)) {
        checkLatest = false; // check latest doesn't make sense when explicit version
    }

    let toolPath: string;
    if (!checkLatest) {
        toolPath = toolLib.findLocalTool('helm', versionSpec);
    }

    if (!toolPath) {
        let version: string;
        if (toolLib.isExplicitVersion(versionSpec)) {
            // Explicit version was specified. No need to query for list of versions.
            version = versionSpec;
        }
        else {
            version = await queryLatestMatch(versionSpec);
            if (!version) {
                throw new Error(`Unable to find Helm version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`);
            }

            //
            // Check the cache for the resolved version.
            //
            toolPath = toolLib.findLocalTool('helm', version)
        }

        if (!toolPath) {
            toolPath = await acquireHelm(version);
        }
    }
}

async function queryLatestMatch(versionSpec: string): Promise<string> {
    //
    // Hopefully your tool supports an easy way to get a version list.
    //
    let dataFileName: string;
    switch (osPlat) {
        case "linux": dataFileName = "linux-" + osArch; break;
        case "darwin": dataFileName = "osx-" + osArch + '-tar'; break;
        case "win32": dataFileName = "win-" + osArch + '-exe'; break;
        default: throw new Error(`Unexpected OS '${osPlat}'`);
    }

    let versions: string[] = [];
    let dataUrl = "https://api.github.com/repos/kubernetes/helm/releases";
    let rest: restm.RestClient = new restm.RestClient('debben');
    let helmVersions: IHelmVersion[] = (await rest.get<IHelmVersion[]>(dataUrl, { additionalHeaders: { "User-Agent": "debben"}})).result;
    versions = helmVersions.map((helmVersion:IHelmVersion) => helmVersion.tag_name);

    //
    // Get the latest version that matches the version spec.
    //
    let version: string = toolLib.evaluateVersions(versions, versionSpec);

    return version;
}

async function acquireHelm(version: string): Promise<string> {
    //
    // Download - a tool installer intimately knows how to get the tool (and construct urls)
    //
    version = toolLib.cleanVersion(version);
    let arch: string = os.arch() == 'x64' ? 'amd64' : os.arch();
    let fileName: string = osPlat == 'win32'? 'helm-v' + version + '-windows-' + arch :
                                                'helm-v' + version + '-' + osPlat + '-' + arch;  

    let urlFileName: string = fileName + '.tar.gz';

    let downloadUrl = 'https://storage.googleapis.com/kubernetes-helm/' + urlFileName;

    let downloadPath: string = await toolLib.downloadTool(downloadUrl);

    //
    // Extract
    //
    let extPath: string;
    if (osPlat == 'win32') {
        tl.assertAgent('2.115.0');
        extPath = tl.getVariable('Agent.TempDirectory');
        if (!extPath) {
            throw new Error('Expected Agent.TempDirectory to be set');
        }

        extPath = path.join(extPath, 'n'); // use as short a path as possible due to nested node_modules folders
        extPath = await toolLib.extractTar(downloadPath);
    }
    else {
        extPath = await toolLib.extractTar(downloadPath);
    }

    //
    // Install into the local tool cache - helm extracts with a root folder that matches the fileName downloaded
    //
    let toolRoot = path.join(extPath, osPlat == 'win32'? 'windows-' + arch : osPlat + '-' + arch);
    return await toolLib.cacheDir(toolRoot, 'helm', version);
}

export function getTempDirectory(): string {
    return os.tmpdir();
}

export function getCurrentTime(): number {
    return new Date().getTime();
}

export function getNewUserDirPath(): string {
    var userDir = path.join(getTempDirectory(), "kubectlTask");
    ensureDirExists(userDir);

    userDir = path.join(userDir, getCurrentTime().toString());
    ensureDirExists(userDir);

    return userDir;
} 

function ensureDirExists(dirPath : string) : void
{
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
}