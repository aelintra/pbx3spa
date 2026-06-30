# tt_help_core rows not referenced by SPA field help

**Generated:** 2026-06-30 · **Script:** `scripts/audit-unreferenced-help.mjs`

Lists `tt_help_core` pkeys in `sqlite_message.sql` that no SPA form control resolves to via `help-pkey`, `deriveHelpPkeyFromFieldId()`, or tenant advanced field keys.

These rows may be legacy-only, awaiting a panel, or safe to retire after review.

| Metric | Count |
|--------|------:|
| tt_help_core rows | 409 |
| SPA-referenced pkeys | 209 |
| **Unreferenced** | **230** |

## Unreferenced help rows

| pkey | displayname |
|------|-------------|
| `acl` | Create Extension ACLs |
| `Act` | Act? |
| `action` | Action |
| `agentname` | Name |
| `agentstart` | Agent Start |
| `alert` | Diagnostic Alerts |
| `alphatag` | Tag |
| `alternate` | Alternate Route to remote Host |
| `astfiledate` | create date |
| `astfilename` | Filename |
| `ato` | Abstime |
| `authnum` | Authorized Number |
| `backchan` | Back Channel |
| `beginclosed` | Beginning of Closed Period |
| `blfhead` | BLF/DSS Keys |
| `blfkey` | FKEY |
| `blfkeyname` | Keyfile |
| `blfkeys` | BLF# |
| `blflabel` | Label |
| `blftype` | Type |
| `blfvalue` | Target |
| `blindbusy` | Bounce busy destination |
| `blksize` | Quantity |
| `bouncealert` | Alert-Info for Xfer Bounce |
| `bt` | boot |
| `callduration` | Secs |
| `calleridname` | Extension Name |
| `callfromto` | Number |
| `callgroup` | Number |
| `callshelp` | Calls help |
| `calltime` | Time |
| `camponqonoff` | Campon Mini-queue |
| `camponqopt` | Mini-queue options |
| `carrier` | Carrier |
| `carriertype` | Type |
| `cdialstring` | Custom Dial String |
| `cdr` | Log CDR to MySQL |
| `cfwdextrn_rule` | CFWD Override CLID |
| `chooserDiD` | Route Type |
| `clidstart` | Caller ID |
| `clinumber` | CLID Number/Pattern |
| `clusterid` | Prefix |
| `clusterstart` | Tenant support |
| `cn` | Contact |
| `compression` | CODEC |
| `conf` | queues.conf Stanza |
| `copy` | Copy |
| `cosclosed` | Default Closed |
| `cosday` | Day time Class of Service |
| `cosnight` | Night time Class of Service |
| `cosopen` | Default Open |
| `cosstart` | Class Of Service |
| `country` | Your Country Identifier |
| `ct` | Connected |
| `datemonth` | Date |
| `ddial` | <span>&nbsp;</span> |
| `del` | Del |
| `devicename` | Template Name |
| `dhcp` | DHCP |
| `dhcpaddr` | DHCP |
| `dhcpend` | DHCP pool end |
| `dhcpserver` | DHCP server |
| `dhcpstart` | DHCP pool start |
| `dialparams` | Dial Params |
| `didend` | DiD End |
| `dl` | D/L |
| `dynamicfeatures` | Dynamic Features |
| `eclose` | Reopen |
| `ed` | Edit |
| `edomainsend` | Use public IP? |
| `endclosed` | End of Closed Period |
| `eurl` | External URL |
| `ext` | Ext |
| `extblklst` | Use external blacklists? |
| `extension` | Extension |
| `externalip` | Registration URI for remote phones |
| `extlen` | Extension Length |
| `fax` | Autosense FAX Extension |
| `faxdetect` | FAX Detect Delay |
| `faxonoff` | Fax detect |
| `filesize` | Filesize |
| `forename` | Forename |
| `fqdnhttp` | Filter my FQDN for HTTP? |
| `fqdnipaddress` | IP Address |
| `fqdnprov` | Provision with FQDN? |
| `fqdntrust` | Accept dynamic URLs? |
| `fresetbackups` | Delete backups |
| `fresetboot` | Reset Reboot |
| `fresetcdrs` | Delete CDRS |
| `fresetcontinue` | Reset Continue |
| `fresetdb` | Reset the PBX3 Database to factory |
| `fresetdhcp` | Reset IP to DHCP |
| `fresetfirewall` | Reset Firewall rules to factory |
| `fresethost` | Reset host to PBX3 |
| `fresetldap` | Delete ldap directory entries |
| `fresetlogs` | Delete system logs |
| `fresetsnaps` | Delete Snapshots |
| `fresetsshport` | Reset SSH to port 22 |
| `fresetusergreets` | Delete user greetings |
| `fresetvmail` | Delete Voicemail |
| `fresetvrec` | Delete call recordings |
| `fwdest` | Dest |
| `gatewayip` | Gateway |
| `groupname` | Group id |
| `groupstring` | Target |
| `grouptype` | Type |
| `header` | Asterisk Filename |
| `headlocation` | L/R |
| `hhmm` | Time (hh:mm) |
| `home` | Tel3 |
| `httppassword` | Password |
| `include` | Include |
| `int_ring_delay` | Default Ring Time(seconds) |
| `ipaddr` | IP |
| `IPV6GUA` | Global Unicast Address |
| `IPV6LLA` | Link Local Address |
| `IPV6ULA` | Unique Local Address |
| `ivrActive` | Active? |
| `ivrHelp` | IVR Keys |
| `ivrname` | IVR Name |
| `ivrnumber` | IVR Number |
| `keyboardDial` | &nbsp; |
| `lanipaddr` | DHCP IPV4 Address |
| `latency` | latency |
| `line` | Line |
| `localhost` | Local Host Name |
| `localnets` | Asterisk IPV4 Localnets |
| `location` | Local/Remote? |
| `logsip` | Log Action |
| `logsipfilter` | Filter |
| `macblock` | MAC List |
| `mcastip` | IP Address |
| `mcastlport` | Linksys Port |
| `mcastpkey` | Group |
| `mcastport` | Port |
| `mixmonitor` | Mix monitor |
| `mobile` | Tel2 |
| `modified` | Modified |
| `mohhead` | Music-on-Hold |
| `monitor` | Monitor this resource |
| `month` | Month |
| `natdefault` | Default NAT setting |
| `natparams` | Default NAT Parameter String |
| `netmask` | Netmask |
| `new` | New |
| `newpassword` | New Password |
| `newpassword2` | Re-Enter |
| `ntp-servers` | NTP Server Pool |
| `obeydnd` | ObeyDND |
| `oclo` | Timer State |
| `operator` | System Operator(default 0) |
| `orideclosed` | Override |
| `orideopen` | Override |
| `padminpass` | Phone Admin Password |
| `phone` | Tel1 |
| `play` | Play |
| `port` | Port |
| `portrangeend` | Port Range End |
| `portrangestart` | Port Range Start |
| `postdial` | Dial String Lead-out |
| `preannounce` | Preannounce |
| `predial` | Dial String Lead-in |
| `prefix` | Dial Prefix |
| `proxy` | Dynamic Proxy Enable |
| `puserpass` | Phone User Password |
| `push` | Push |
| `pwdlen` | Ext password length |
| `queuename` | Name |
| `realname` | User Name |
| `rec_mount` | Call recording mount command |
| `register` | Registration String |
| `regress` | Reg |
| `regthistrunk` | Generate a registration string |
| `remotenum` | DiD Number |
| `resetasterisk` | Restore the Asterisk folder |
| `resetdb` | Restore the PBX3 Database |
| `resetldap` | Restore the LDAP directory |
| `resetpwd` | Reset pwd |
| `resetusergreets` | Restore usergreetings |
| `resetvmail` | Restore voicemail |
| `rev` | Version |
| `routeable` | Routeable? |
| `routedesc` | Description |
| `routename` | Route Name |
| `rule` | Extension Number |
| `runfop` | Flash Operator Panel |
| `s-peername` | Far-end Hostname |
| `schedend` | End |
| `schedstart` | Start |
| `sclose` | close |
| `searchkey` | goKey |
| `secondary` | Secondary Path |
| `selectall` | Select All |
| `sipdriver` | SIP Channel Driver |
| `sipiaxfriend` | SIP Peer entry |
| `sipiaxstart` | Extension Start Number |
| `sipiaxuser` | SIP user entry |
| `sipmulticast` | PnP Provisioning |
| `smartlink` | Smartlink |
| `sndcreds` | Auth |
| `source` | Source |
| `sshport` | SSH Port |
| `supemail` | Supervisor Email |
| `surname` | Name |
| `tactive` | A |
| `tenantoperator` | Operator |
| `timespan` | Time Span |
| `tls` | SIP TLS/SRTP |
| `toggleDhcpd` | Run as DHCP Server? |
| `toggleDhcpElement` | Use DHCP to obtain an IP address? |
| `tstate` | State |
| `twin` | Enable Twinning |
| `uname` | User |
| `user` | Userid |
| `usercreate` | Autocreate User Logins |
| `useremail` | Email |
| `userotp` | User One Time Password |
| `userpass` | Password |
| `userscope` | Scope |
| `userspan` | Span |
| `vdelete` | Empty the mailbox |
| `version` | Version |
| `vp` | Vp |
| `vr` | Vr |
| `vreset` | Reset Vmail password |
| `vringdelay` | Induced VoIP Ring Delay |
| `weekday` | Day |
| `xref` | Cross Reference |
| `year` | Year |
| `ztp` | Zero Touch Provisioning |
