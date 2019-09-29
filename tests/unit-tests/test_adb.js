"use strict";

/*
 * Copyright (C) 2017-2019 UBports Foundation <info@ubports.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const fs = require('fs');
const exec = require('child_process').exec;
const chai = require('chai');
const sinon = require('sinon');
const chaiAsPromised = require("chai-as-promised");
const sinonChai = require("sinon-chai");
const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);

const Adb = require('../../src/module.js').Adb;

describe('Adb module', function() {
  describe("constructor()", function() {
    it("should create default adb when called without arguments", function() {
      const adb = new Adb();
      expect(adb.exec).to.exist;
      expect(adb.log).to.equal(console.log);
      expect(adb.port).to.equal(5037);
    });
    it("should create default adb when called with unrelated object", function() {
      const adb = new Adb({ });
      expect(adb.exec).to.exist;
      expect(adb.log).to.equal(console.log);
      expect(adb.port).to.equal(5037);
    });
    it("should create custom adb when called with valid options", function() {
      const execStub = sinon.stub();
      const logStub = sinon.stub();
      const adb = new Adb({exec: execStub, log: logStub, port: 1234});
      expect(adb.exec).to.equal(execStub);
      expect(adb.exec).to.not.equal(logStub);
      expect(adb.log).to.equal(logStub);
      expect(adb.log).to.not.equal(execStub);
      expect(adb.port).to.equal(1234);
    });
  });
  describe("exec()", function() {
    it("should call the specified function", function() {
      const execSpy = sinon.spy();
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execSpy, log: logSpy});
      adb.exec("This is an argument");
      expect(execSpy).to.have.been.calledWith("This is an argument");
    });
  })
  describe("execPort()", function() {
    it("should call an executable with port argument", function() {
      const execStub = (args, callback) => {
        exec("node tests/test-data/fake_executable.js " + args.join(" "), callback);
      };
      const logStub = sinon.stub();
      const adb = new Adb({exec: execStub, log: logStub, port: 1234});
      return adb.execPort().then((r, r2, r3) => {
        expect(r).to.equal("-P 1234\n");
      });
    });
    it("should throw an error of no device is connected");
  });
  describe("startServer()", function() {
    it("should kill all servers and start a new one", function() {
      const execFake = sinon.fake((args, callback) => { callback(); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.startServer().then((r) => {
        expect(r).to.equal(undefined);
        expect(execFake).to.have.been.calledTwice;
        expect(execFake).to.have.been.calledWith(["-P", 5037, "kill-server"]);
        expect(execFake).to.have.been.calledWith(["-P", 5037, "start-server"]);
        expect(logSpy).to.have.been.calledTwice;
        expect(logSpy).to.have.been.calledWith("killing all running adb servers");
        expect(logSpy).to.have.been.calledWith("starting adb server on port 5037");
      });
    });
  });
  describe("killServer()", function() {
    it("should kill all servers", function() {
      const execFake = sinon.fake((args, callback) => { callback(); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.killServer().then((r) => {
        expect(r).to.equal(undefined);
        expect(execFake).to.have.been.calledOnce;
        expect(execFake).to.not.have.been.calledTwice;
        expect(execFake).to.have.been.calledWith(["-P", 5037, "kill-server"]);
        expect(logSpy).to.not.have.been.calledTwice;
        expect(logSpy).to.have.been.calledWith("killing all running adb servers");
      });
    });
  });
  describe("getSerialno()", function() {
    it("should return serialnumber", function() {
      const execFake = sinon.fake((args, callback) => { callback(false, "1234567890ABCDEF\n"); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.getSerialno().then((r) => {
        expect(r).to.equal("1234567890ABCDEF");
        expect(execFake).to.have.been.calledOnce;
        expect(execFake).to.have.been.calledWith(["-P", 5037, "get-serialno"]);
      });
    });
    it("should return error on invalid return", function() {
      const execFake = sinon.fake((args, callback) => { callback(false, "This is an invalid string"); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return expect(adb.getSerialno()).to.be.rejectedWith("invalid device id");
    });
  });
  describe("shell()", function() {
    it("should run command on device", function() {
      const execFake = sinon.fake((args, callback) => { callback(null, "This string is returned over stdout"); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.shell(["one", "two", "three"]).then((r) => {
        expect(r).to.equal("This string is returned over stdout");
        expect(execFake).to.have.been.called;
      });
    });
  });
  describe("getDeviceName()", function() {
    it("should get device name from getprop", function() {
      const execFake = sinon.fake((args, callback) => { callback(null, "thisisadevicecodename"); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.getDeviceName().then((r) => {
        expect(r).to.equal("thisisadevicecodename");
        expect(execFake).to.have.been.calledWith(["-P", 5037, "shell", "getprop", "ro.product.device"]);
      });
    });
    it("should get device name from default prop file");
    it("should throw an error if prop can't be found");
  });
  describe("getOs()", function() {
    it("should resolve \"ubuntutouch\"", function() {
      const execFake = sinon.fake((args, callback) => { callback(null, "Contents of the system-image file go here"); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.getOs().then((r) => {
        expect(r).to.equal("ubuntutouch");
        expect(execFake).to.have.been.calledWith(["-P", 5037, "shell", "cat", "/etc/system-image/channel.ini"]);
      });
    });
    it("should resolve \"android\"", function() {
      const execFake = sinon.fake((args, callback) => { callback(null, null); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.getOs().then((r) => {
        expect(r).to.equal("android");
        expect(execFake).to.have.been.calledWith(["-P", 5037, "shell", "cat", "/etc/system-image/channel.ini"]);
      });
    });
  });
  describe("hasAccess()", function() {
    it("should resolve true", function() {
      const execFake = sinon.fake((args, callback) => { callback(null, "."); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.hasAccess().then((r) => {
        expect(r).to.equal(true);
        expect(execFake).to.have.been.calledWith(["-P", 5037, "shell", "echo", "."]);
      });
    });
    it("should resolve false", function() {
      const execFake = sinon.fake((args, callback) => { callback(null, null); });
      const logSpy = sinon.spy();
      const adb = new Adb({exec: execFake, log: logSpy});
      return adb.hasAccess().then((r) => {
        expect(r).to.equal(false);
        expect(execFake).to.have.been.calledWith(["-P", 5037, "shell", "echo", "."]);
      });
    });
  });
});
