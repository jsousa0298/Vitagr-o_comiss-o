/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */

define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function onAction(scriptContext) {
        try {
            const currentRecord = scriptContext.newRecord;
            const recordType = currentRecord.type;
            const idRec = currentRecord.id;
            const idSalesRep = currentRecord.getValue('custrecord_tk_sales_rep_ls');

            log.audit('idSalesRep', idSalesRep);

            // let customSearchEditing = search.create({
            //     type: 'customrecord_tk_value_editing',
            //     filters: [['custrecord_tk_commission_query_edit_link', 'is', idRec]],
            //     columns: [
            //         'custrecord_tk_invoice_edit_ls',
            //         'custrecord_tk_credit_cr',
            //         'custrecord_tk_debit_cr',
            //         'custrecord_tk_commission_value',
            //         'custrecord_tk_final_value'
            //     ]
            // });

            // let searchResultEditing = customSearchEditing.run().getRange({ start: 0, end: 1000 });

            // searchResultEditing.forEach(result => {
            //     let fiscalDoc = result.getValue('custrecord_tk_invoice_edit_ls');
            //     let finalValue = result.getValue('custrecord_tk_final_value');

            //     // if (finalValue) {
            //     //     record.submitFields({
            //     //         type: 'invoice',
            //     //         id: fiscalDoc,
            //     //         values: {
            //     //             custbody_tk_commission_amount: finalValue
            //     //         },
            //     //         options: {
            //     //             enableSourcing: false,
            //     //             ignoreMandatoryFields: true
            //     //         }
            //     //     });
            //     // }
            // });

            let customSearch = search.create({
                type: 'customrecord_tk_commission_management_ad',
                filters: [
                    ['custrecord_tk_commission_query_adjustmen', 'is', idRec]
                ],
                columns: [
                    'custrecord_tk_designated_representative',
                    'custrecord_tk_value_amount',
                    'custrecord_tk_sales_representative_sl',
                    'custrecord_tk_doc_invoice_sl'
                ]
            });

            let searchResult = customSearch.run().getRange({ start: 0, end: 1000 });

            let commissionTotals = {};

            if (searchResult && searchResult.length > 0) {
                searchResult.forEach(result => {
                    let assignedRep = result.getValue('custrecord_tk_designated_representative');
                    let totalValue = parseFloat(result.getValue('custrecord_tk_value_amount')) || 0;
                    let salesRep = result.getValue('custrecord_tk_sales_representative_sl');
                    let fiscalDoc = result.getValue('custrecord_tk_doc_invoice_sl');

                    let repKey = assignedRep || salesRep;

                    if (assignedRep && fiscalDoc) {
                        record.submitFields({
                            type: 'invoice',
                            id: fiscalDoc,
                            values: {
                                salesrep: assignedRep,
                                custbody_tk_commission_amount: totalValue,
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    }

                    if (repKey) {
                        if (!commissionTotals[repKey]) {
                            commissionTotals[repKey] = {
                                repKey: repKey,
                                total: 0,
                                fiscalDocs: []
                            };
                        }
                        commissionTotals[repKey].total += totalValue;

                        if (fiscalDoc && !commissionTotals[repKey].fiscalDocs.includes(fiscalDoc)) {
                            commissionTotals[repKey].fiscalDocs.push(fiscalDoc);
                        }
                    }
                });
            }

            for (const key in commissionTotals) {
                if (commissionTotals.hasOwnProperty(key)) {
                    log.audit('Fiscais para PO', commissionTotals[key].fiscalDocs);
                    var total = commissionTotals[key].fiscalDocs;
                    var idRep = commissionTotals[key].repKey

                    for (var index = 0; index < total.length; index++) {
                        if (idSalesRep == idRep) {
                            const typeSearch = search.lookupFields({
                                type: search.Type.TRANSACTION,
                                id: total[index],
                                columns: ['recordtype']
                            });

                            record.submitFields({
                                type: typeSearch.recordtype,
                                id: total[index],
                                values: {
                                    custbody_tk_gerad_comission: true
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });

                            log.debug('Tipo de transação', typeSearch.recordtype);
                        }
                    }

                    if (idSalesRep == idRep) {

                        let purchaseOrder = record.create({ type: 'vendorbill', isDynamic: true });
                        purchaseOrder.setValue({ fieldId: 'entity', value: getEmployeePartnerId(idRep) });
                        purchaseOrder.setValue({ fieldId: 'location', value: 2 });

                        purchaseOrder.selectNewLine({ sublistId: 'item' });
                        purchaseOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 2210 });
                        purchaseOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                        if (commissionTotals[key].total < 0) {
                            purchaseOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: commissionTotals[key].total * -1 });
                        } else {
                            purchaseOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: commissionTotals[key].total });
                        }
                        purchaseOrder.commitLine({ sublistId: 'item' });

                        let poId = purchaseOrder.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

                        if (poId) {
                            let recordPoComission = record.create({ type: 'customrecord_tk_commission_management_ad', isDynamic: true });
                            recordPoComission.setValue({ fieldId: 'custrecord_tk_doc_invoice_sl', value: poId });
                            recordPoComission.setValue({ fieldId: 'custrecord_tk_sales_representative_sl', value: idRep });
                            recordPoComission.setValue({ fieldId: 'custrecord_tk_commission_query_adjustmen', value: idRec });
                            recordPoComission.setValue({ fieldId: 'custrecord_tk_value_amount', value: commissionTotals[key].total * -1 });


                            var recordId = recordPoComission.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            });

                            currentRecord.setValue('custrecord5', true);
                            log.audit('Comissão registrada', recordId);
                            marcarFaturaGerada(idRec)
                        }
                    }
                }
            }

            function getEmployeePartnerId(employeeId) {
                if (!employeeId) return null;

                const partner = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: employeeId,
                    columns: ['custentity_tkg_parceiro']
                })?.custentity_tkg_parceiro;

                return partner?.[0]?.value || null;
            }

            marcarFaturaGerada(idRec)


        } catch (e) {
            log.error('Erro ao executar o workflow action script', e);
        }
    }

    function marcarFaturaGerada(idRec) {
        const resultados = search.create({
            type: 'customrecord_tk_commission_management_ad',
            filters: [
                ['custrecord_tk_commission_query_adjustmen', 'is', idRec],
                'AND',
                ['custrecord_tk_designated_representative', 'anyof', '@NONE@'],
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1000 });

        resultados.forEach(result => {
            const internalId = result.getValue({ name: 'internalid' });

            record.submitFields({
                type: 'customrecord_tk_commission_management_ad',
                id: internalId,
                values: {
                    custrecord_tk_fatura_gerada: true
                }
            });
        });
    }

    return {
        onAction: onAction
    };
});
