"use strict";

import * as fs from "fs";
import * as path from "path";
import * as tl from "vsts-task-lib/task";
import * as trm from "vsts-task-lib/toolrunner";
import * as toolLib from 'vsts-task-tool-lib/tool';
import * as restm from 'typed-rest-client/RestClient';
import * as os from "os";
import * as uuidV4 from 'uuid/v4';

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

    let urlFileName: string = fileName +  '.tar.gz';

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
        extPath = await extractTar(downloadPath);
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

/**
 * The following code is used with attribution from 
 * https://github.com/Microsoft/vsts-task-tool-lib and 
 * caries with it the following copyright and MIT license
 * statement:
 * 
 *  MIT License

    Copyright (c) Microsoft Corporation. All rights reserved.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE
 * 
 */

function _getAgentTemp(): string {
    tl.assertAgent('2.115.0');
    let tempDirectory = tl.getVariable('Agent.TempDirectory');
    if (!tempDirectory) {
        throw new Error('Agent.TempDirectory is not set');
    }

    return tempDirectory;
}

async function extractTar(file: string): Promise<string> {

    console.log(tl.loc('TOOL_LIB_ExtractingArchive'));
    let dest = (() => {
        let dest = path.join(_getAgentTemp(), uuidV4());
    
        tl.mkdirP(dest);
        return dest;
    })();

    let tr: trm.ToolRunner = tl.tool('tar');
    tr.arg(['xzC', dest.replace('\\','/'), '--force-local', '-f', file]);

    await tr.exec();
    return dest;
}