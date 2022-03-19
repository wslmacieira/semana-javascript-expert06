import { describe, test, jest, expect, beforeEach } from  '@jest/globals'
import { join, extname } from 'path';
import fs from  'fs'
import fsPromises from 'fs/promises';
import childProcess from 'child_process';
import { PassThrough, Writable } from 'stream';
import streamsAsync from 'stream/promises'
import Throttle from 'throttle'

import { Service } from '../../../server/service.js';
import TestUtil from '../_util/testUtil.js';
import config from '../../../server/config.js';

const {
  dir: { publicDirectory },
  constants: { fallbackBitRate, bitRateDivisor }
} = config

describe('#Service - test suite for api response', () => {
  const service = new Service();
  const getSpawnResponse = ({
    stdout = '',
    stderr = '',
    stdin = () => {}
  }) => ({
    stdout: TestUtil.generateReadableStream([stdout]),
    stderr: TestUtil.generateReadableStream([stderr]),
    stdin: TestUtil.generateWritableStream(stdin),
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('#createFileStream - should return a read stream', async () => {
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const filename = '/index.html'

    jest.spyOn(
      fs,
      fs.createReadStream.name
      ).mockReturnValue(mockFileStream);

      service.createFileStream(filename)

    expect(fs.createReadStream).toHaveBeenCalledWith(filename)
  });

  test('#getFileInfo - should return a type and name', async () => {
    const currentSong = 'mySong.mp3';
    const fullFilepath = join(publicDirectory, currentSong)
    jest.spyOn(
      fsPromises,
      fsPromises.access.name
      ).mockResolvedValue({
        type: '.mp3',
        name: `${publicDirectory}/${currentSong}`
      });
      await service.getFileInfo(currentSong)
    expect(fsPromises.access).toBeCalledWith(fullFilepath)
  });

  test('#getFileStream - should return a stream and type', async () => {
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const currentSong = 'mySong.mp3';
    const fullFilepath = join(publicDirectory, currentSong)
    const fileType = extname(fullFilepath);

    jest.spyOn(
      service,
      service.getFileInfo.name
      ).mockResolvedValue({
        type: fileType,
        name: fullFilepath
      });

      jest.spyOn(
        service,
        service.createFileStream.name
        ).mockResolvedValue(mockFileStream);

      await service.getFileStream(currentSong)

    expect(service.getFileInfo).toBeCalledWith(currentSong)
  });

  test('#removeClientStream', () => {
    const service = new Service();
    jest.spyOn(
      service.clientStreams,
      service.clientStreams.delete.name
    ).mockReturnValue();
    const mockId = '1';
    service.removeClientStream(mockId);

    expect(service.clientStreams.delete).toHaveBeenCalledWith(mockId);
  })

  test('#createClientStream', () => {
    jest.spyOn(
      service.clientStreams,
      service.clientStreams.set.name
    ).mockReturnValue();

    const {
      id,
      clientStream
    } = service.createClientStream();

    expect(id.length).toBeGreaterThan(0);
    expect(clientStream).toBeInstanceOf(PassThrough);
    expect(service.clientStreams.set).toHaveBeenCalledWith(id, clientStream);
  });

  test('#stopStreaming - existing throttleTransform', () => {
    service.throttleTransform = new Throttle(1);

    jest.spyOn(
      service.throttleTransform,
      "end",
    ).mockReturnValue();

    service.stopStreaming();
    expect(service.throttleTransform.end).toHaveBeenCalled();
  });

  test('#broadCast - it should write only for active client streams', () => {
    const service = new Service();
    const onData = jest.fn();
    const client1 = TestUtil.generateWritableStream(onData);
    const client2 = TestUtil.generateWritableStream(onData);
    jest.spyOn(
      service.clientStreams,
      service.clientStreams.delete.name
    );

    service.clientStreams.set('1', client1);
    service.clientStreams.set('2', client2);
    client2.end();

    const writable = service.broadCast();
    // vai mandar somente para o client1 pq o outro desconectou
    writable.write('Hello World');

    expect(writable).toBeInstanceOf(Writable);
    expect(service.clientStreams.delete).toHaveBeenCalled();
    expect(onData).toHaveBeenCalledTimes(1);
  });

  test('#getBitRate - it should return the bitRate as string', async () => {
    const song = 'mySong'
    const spawnResponse = getSpawnResponse({ stdout: '1k' });

    jest.spyOn(
      service,
      service._executeSoxCommand.name
    ).mockReturnValue(spawnResponse);

    const bitRatePromise = service.getBitRate(song);
    const result = await bitRatePromise;

    expect(result).toStrictEqual('1000');
    expect(service._executeSoxCommand).toHaveBeenCalledWith(['--i', '-B', song]);
  });

  test('#getBitRate - when an error ocurred it should get the fallbackBitRate', async () => {
    const song = 'mySong';
    const spawnResponse = getSpawnResponse({ stderr: 'error!'});

    jest.spyOn(
      service,
      service._executeSoxCommand.name
    ).mockReturnValue(spawnResponse);

    const bitRatePromise = service.getBitRate(song)
    const result = await bitRatePromise;
    expect(result).toStrictEqual(fallbackBitRate);
    expect(service._executeSoxCommand).toHaveBeenCalledWith(['--i', '-B', song]);
  })

  test('#_executeSoxCommand - it should call the sox command', async () => {
    const spawnResponse = getSpawnResponse({ stdout: '1k' });

    jest.spyOn(
      childProcess,
      childProcess.spawn.name
    ).mockReturnValue(spawnResponse);

    const args = ['myArgs']
    const result = service._executeSoxCommand(args);

    expect(childProcess.spawn).toHaveBeenCalledWith('sox', args)
    expect(result).toStrictEqual(spawnResponse);
  });

  test('#startStreaming - it should call the sox command', async () => {
    const currentSong = 'mySong.mp3'
    service.currentSong = currentSong
    const currentReadable = TestUtil.generateReadableStream(['abc'])
    const expectedResult = 'ok'
    const writableBroadCaster = TestUtil.generateWritableStream(() => {})

    jest.spyOn(
      service,
      service.getBitRate.name
    ).mockResolvedValue(fallbackBitRate)

    jest.spyOn(
      streamsAsync,
      streamsAsync.pipeline.name
    ).mockResolvedValue(expectedResult)

    jest.spyOn(
      fs,
      fs.createReadStream.name
    ).mockReturnValue(currentReadable)

    jest.spyOn(
      service,
      service.broadCast.name
    ).mockReturnValue(writableBroadCaster)

    const expectedThrottle = fallbackBitRate / bitRateDivisor
    const result = await service.startStreaming()

    expect(service.currentBitRate).toEqual(expectedThrottle)
    expect(result).toEqual(expectedResult)

    expect(service.getBitRate).toHaveBeenCalledWith(currentSong)
    expect(fs.createReadStream).toHaveBeenCalledWith(currentSong)
    expect(streamsAsync.pipeline).toHaveBeenCalledWith(
      currentReadable,
      service.throttleTransform,
      service.broadCast()
    )
  });

})